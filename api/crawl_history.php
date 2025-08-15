<?php
require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$apiUrl = $_ENV['BASE_URL'];
$apiKey = $_ENV['CUSTOM_API_KEY'];

$url = $apiUrl . '/crawl-history';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['x-api-key: ' . $apiKey]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE));
echo $response;
curl_close($ch);
