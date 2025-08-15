<?php
require_once '../db/db_config.php';

header('Content-Type: application/json');

if (!isset($_POST['id'])) {
    echo json_encode(['status' => 'error', 'message' => 'No category ID provided.']);
    exit;
}

$id = intval($_POST['id']); // Sanitize

$sql = "DELETE FROM article_category WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Category deleted.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to delete category.']);
}

$stmt->close();
$conn->close();
