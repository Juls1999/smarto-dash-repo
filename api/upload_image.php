<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['upload'])) {
    // Full filesystem path to /kb-figma/public/assets/
    $uploadDir = __DIR__ . '/../public/assets/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileName = uniqid() . '_' . basename($_FILES['upload']['name']);
    $targetFile = $uploadDir . $fileName;

    if (move_uploaded_file($_FILES['upload']['tmp_name'], $targetFile)) {
        // Public URL to access the uploaded image
        $url = '/kb-figma/public/assets/' . $fileName;
        echo json_encode(['url' => $url]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save image.']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid upload.']);
}
