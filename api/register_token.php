<?php
require_once("../access_db.php");
/*

//TABLE CREATED IN THE DATABASE

CREATE TABLE api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,

    email VARCHAR(255) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,  -- SHA-256 hashed token

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    last_used DATETIME,

    -- 🔍 Indexes
    INDEX idx_token_hash (token_hash),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_used (last_used)
);

*/

function generateToken($length = 64) {
    return bin2hex(random_bytes($length / 2)); // returns a 64-char token
}

function send_email_to_user($email, $plain_token){
	$to = $email; // user-provided email address
	$subject = "Your API Access Token for Hippocampome.org";
	$message = "
		Hello,

		Here is your API token. Please save it securely. It will not be shown again.

			Token: $plain_token

			You can now use this token in your API requests with the header:
			Authorization: Bearer $plain_token

			Regards,
		Your Hippocampome API Team
			";

	$headers = "From: knadella@gmu.edu\r\n";
	$headers .= "Reply-To: knadella@gmu.edu\r\n";
	$headers .= "X-Mailer: PHP/" . phpversion();

	$mail_sent = mail($to, $subject, $message, $headers);

	if ($mail_sent) {
		echo "A secure API token has been sent to <strong>$email</strong>.";
	} else {
		echo "Failed to send email. Please try again.";
	}
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email']);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die("Invalid email.");
    }

    $plain_token = generateToken(); // this will be emailed/displayed to the user
    $token_hash = hash('sha256', $plain_token); // hash stored in DB
    $expires = date('Y-m-d H:i:s', strtotime('+30 days'));

    $stmt = $conn->prepare("INSERT INTO api_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $email, $token_hash, $expires);
    $stmt->execute();

    echo "Your token (save securely): <code>$plain_token </code>.";
    send_email_to_user($email, $plain_token);
}

?>
<form method="POST">
    Enter your email to generate API token: <input name="email" required />
    <button type="submit">Generate Token</button>
</form>

