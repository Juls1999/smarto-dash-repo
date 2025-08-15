<?php
require_once '../../db/db_config.php';

$sql = "SELECT id, prompt, ai_response, feedback AS feedback_type, dat AS created_at FROM feedback ORDER BY dat DESC";
$result = $conn->query($sql);

$feedbacks = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $feedbacks[] = $row;
    }
}

$conn->close();
