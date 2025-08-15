<?php
require_once '../db/db_config.php';

header('Content-Type: application/json');

$response = [];

try {
    // ✅ Get category_id from GET parameter
    $category_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;

    if ($category_id <= 0) {
        throw new Exception("Invalid category ID.");
    }

    // ✅ Prepare the SQL with category info
    $sql = "SELECT 
                ac.id   AS category_id,
                ac.name AS category_name,
                ac.description AS category_description,
                a.id    AS article_id,
                a.name  AS article_title,
                a.status,
                a.created_at
            FROM article_category ac
            LEFT JOIN articles a 
                ON ac.id = a.category_id
            WHERE ac.id = ?
            ORDER BY a.id";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $category_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $categoryData = null;

    while ($row = $result->fetch_assoc()) {
        // ✅ Create category wrapper once
        if ($categoryData === null) {
            $categoryData = [
                'category_id' => $row['category_id'],
                'title'       => $row['category_name'],
                'subtitle'    => $row['category_description'],
                'article'     => []
            ];
        }

        // ✅ Add article if it exists
        if (!empty($row['article_id'])) {
            $categoryData['article'][] = [
                'article_id' => $row['article_id'],
                'title'      => $row['article_title'],
                'created_at' => $row['created_at'],
                'status' => $row['status'],
            ];
        }
    }

    // Return as an array for consistency
    $response = $categoryData ? [$categoryData] : [];

    $stmt->close();
} catch (Exception $e) {
    $response = [
        'status'  => 'error',
        'message' => $e->getMessage()
    ];
} finally {
    $conn->close();
    echo json_encode($response);
}
