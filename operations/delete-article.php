<?php
require_once '../db/db_config.php';

header('Content-Type: application/json');

if (!isset($_POST['id'])) {
    echo json_encode(['status' => 'error', 'message' => 'No article ID provided.']);
    exit;
}

$id = intval($_POST['id']); // Sanitize

$sql = "DELETE FROM articles WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Article deleted.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to delete article.']);
}

$stmt->close();
$conn->close();
