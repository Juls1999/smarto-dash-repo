<?php
require_once '../db/db_config.php';
header('Content-Type: application/json');

$response = [];

try {
    // Get article_id from GET parameter
    $article_id = isset($_GET['article_id']) ? (int) $_GET['article_id'] : 0;

    if ($article_id <= 0) {
        throw new Exception("Invalid article ID.");
    }

    // Query to get only id, name, content, created_at
    $sql = "SELECT id, name, content, created_at, status 
            FROM articles 
            WHERE id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $article_id);
    $stmt->execute();
    $result = $stmt->get_result();

    // Fetch article data
    if ($row = $result->fetch_assoc()) {
        $response = $row; // returns exactly those 4 fields
    } else {
        throw new Exception("Article not found.");
    }

    $stmt->close();
} catch (Exception $e) {
    $response = [
        'status' => 'error',
        'message' => $e->getMessage()
    ];
} finally {
    $conn->close();
    echo json_encode($response);
}
