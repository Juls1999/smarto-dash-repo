<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$apiUrl = $_ENV['BASE_URL'];
$apiKey = $_ENV['CUSTOM_API_KEY'];

$id = $_GET['id'] ?? '';
if (!$id) {
  http_response_code(400);
  echo json_encode(['error' => 'Missing ID']);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'];

$url = $apiUrl . '/file/' . urlencode($id);

$ch = curl_init($url);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['x-api-key: ' . $apiKey, 'Content-Type: application/json']);

if ($method === 'PUT') {
  $body = file_get_contents('php://input');
  curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE));
echo $response;

curl_close($ch);
