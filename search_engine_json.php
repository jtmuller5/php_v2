<?php
require_once("SearchEngine/ParenthesisParser.php");
require_once("SearchEngine/NeuronConnection.php");
require_once('SearchEngine/Parser.php');
require_once('SearchEngine/MorphologyPage.php');
require_once('SearchEngine/Term.php');
require_once('SearchEngine/QueryUtil.php');
require_once('SearchEngine/Page.php');
require_once("access_db.php");
?>
<!-- Google Analytics Tracking -->  
<?php include_once("analytics.php") ?>
<?php

function validateToken($conn, $plain_token) {
    $token_hash = hash('sha256', $plain_token);

    $stmt = $conn->prepare("SELECT * FROM api_tokens WHERE token_hash = ? AND is_active = 1 AND expires_at > NOW()");
    $stmt->bind_param("s", $token_hash);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Update last_used timestamp
        $update = $conn->prepare("UPDATE api_tokens SET last_used = NOW() WHERE id = ?");
        $update->bind_param("i", $row['id']);
        $update->execute();
        return true;
    }
    return false;
}

$headers = apache_request_headers();
$authHeader = $headers['Authorization'] ?? '';

if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(["error" => "Missing or malformed Authorization header."]);
    exit;
}

$plain_token = $matches[1];
if (!validateToken($conn, $plain_token)) {
    http_response_code(403);
    echo json_encode(["error" => "Invalid or expired token."]);
    exit;
}

function getClientIP() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }

    // Handle IPv6 localhost (::1) and convert it to 127.0.0.1
    if ($ip === '::1') {
        $ip = '127.0.0.1';
    }

    return $ip;
}

$user_agent = $_SERVER['HTTP_USER_AGENT'];
$query_str = isset($_GET['query_str']) ? trim($_GET['query_str']) : '';

if (empty($query_str)) {
    echo json_encode(["error" => "Query string cannot be empty."]);
    exit;
}
try{
	$requestType = $_SERVER['REQUEST_METHOD']; //echo "Request Type:".$requestType;
	$requestData = json_encode($_REQUEST['query_str']); //echo "Request Data:".$requestData;
	$clientIP = getClientIP(); //echo "Client IP:".$clientIP;
	$requestURI = $_SERVER["REQUEST_URI"]; //echo "Request URI:".$requestURI;
	$returnType = "JSON"; //echo "Return Type:".$returnType;
	if($_REQUEST['query_str']){
		$queryString =$_REQUEST['query_str'];
		$queryString = htmlspecialchars($query_str, ENT_QUOTES, 'UTF-8');
		$test=new Parser();
		$test->setSearchQuery($queryString);
		$matchingConn=$test->parseQuery();
		$data = array();
		for($i=0;$i<count($matchingConn);$i++){
			$index=$i+1;
			$destinationId = $matchingConn[$i]->getDestinationId();
			if ($destinationId == NULL) {
				$data["$index"]=array("source_id"=>$matchingConn[$i]->getSourceId(), "source_name"=>$matchingConn[$i]->getSourceName());
			}
			else {
				$data["$index"]=array("source_id"=>$matchingConn[$i]->getSourceId(), "source_name"=>$matchingConn[$i]->getSourceName(), "destination_id"=>$destinationId, "destination_name"=>$matchingConn[$i]->getDestinationName());
			}
			// $data["$index"]=array("source_id"=>$matchingConn[$i]->getSourceId(),"destination_id"=>$matchingConn[$i]->getDestinationId());
		}
		header('Content-type:application/json;charset=utf-8');
		$returnData = json_encode($data);
		if ($returnData === false) {
			error_log("JSON encoding error: " . json_last_error_msg());
			$returnData = json_encode(["error" => "Failed to encode JSON"]);
		}
		else{
			$returnData = json_encode($data);
		}
		$stmt = $conn->prepare("INSERT INTO search_engine_api_logs (request_type, request, requestURI, request_ip, return_data_type, return_data ) VALUES (?, ?, ?, ?, ?, ?)");
		$stmt->bind_param("ssssss", $requestType, $requestData, $requestURI, $clientIP, $returnType, $returnData);
		if(!$stmt->execute()){ echo "IN IF"; echo $stmt->error; }
		else {
			echo json_encode($returnData);
		}
		//echo($_REQUEST['query_str']);
	}
} catch (Exception $e) {
//	echo json_encode(["error" => "An error occurred while processing your query."]);
	$errorMessage = $e->getMessage();

	// Categorize error types
	if (strpos($errorMessage, 'database') !== false) {
		http_response_code(500); // Internal Server Error
		$returnData = json_encode(["error" => "Internal database error. Please try again later."]);
	} elseif (strpos($errorMessage, 'invalid syntax') !== false) {
		http_response_code(400); // Bad Request
		$returnData = json_encode(["error" => "Invalid query syntax. Please check your query and try again."]);
		//$returnData = json_encode(["error" => "An error occurred while processing your query."]);
	} else {
		http_response_code(500); // General server error
		$returnData = json_encode(["error" => "An unexpected error occurred. Please try again later."]);
	}
	$stmt = $conn->prepare("INSERT INTO search_engine_api_logs (request_type, request, requestURI, request_ip, return_data_type, return_data ) VALUES (?, ?, ?, ?, ?, ?)");
	$stmt->bind_param("ssssss", $requestType, $requestData, $requestURI, $clientIP, $returnType, $returnData);
	if(!$stmt->execute()){ echo "IN IF"; echo $stmt->error; }
	else {
		echo json_encode($returnData);
	}
}
?>
