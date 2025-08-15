<?php
require_once '../db/db_config.php';

header('Content-Type: application/json');

$response = [];

try {
    // Get data from POST
    $categoryId = intval($_POST['categoryId'] ?? 0);
    $title = trim($_POST['title'] ?? '');
    $content = trim($_POST['content'] ?? '');

    if ($categoryId <= 0) {
        throw new Exception("Invalid category ID.");
    }
    if ($title === '') {
        throw new Exception("Article title cannot be empty.");
    }
    if ($content === '') {
        throw new Exception("Article content cannot be empty.");
    }

    // Prepare insert query
    $stmt = $conn->prepare("
        INSERT INTO articles (category_id, name, content, created_at) 
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->bind_param("iss", $categoryId, $title, $content);
    $stmt->execute();

    $response['status'] = 'success';
    $response['message'] = 'Article added successfully';
    $response['insert_id'] = $stmt->insert_id;

    $stmt->close();
} 
catch (mysqli_sql_exception $e) {
    $response['status'] = 'error';
    $response['message'] = 'Database Error: ' . $e->getMessage();
} 
catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
} 
finally {
    if (isset($conn)) {
        $conn->close();
    }
    echo json_encode($response);
}
