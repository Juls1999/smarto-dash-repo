<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$apiUrl = $_ENV['BASE_URL'] . '/crawl-status';  // ✅ points to Node API
$apiKey = $_ENV['CUSTOM_API_KEY'];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'x-api-key: ' . $apiKey
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Forward response
header('Content-Type: application/json');
http_response_code($httpCode);

$json = json_decode($response, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo json_encode($json);
} else {
    echo json_encode([
        'error' => 'Invalid JSON returned from API',
        'raw' => $response
    ]);
}
