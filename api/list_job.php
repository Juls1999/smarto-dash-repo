<?php

$DIGITALOCEAN_TOKEN = "dop_v1_0df5e181f02bb844a253d431a953de9b03eb8c181f1884df019a95f6499f71d6";
$apiUrl = "https://api.digitalocean.com/v2/gen-ai/indexing_jobs";

// Initialize cURL
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $DIGITALOCEAN_TOKEN",
    "Content-Type: application/json"
]);

// Execute
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Display result
if ($httpCode === 200) {
    $data = json_decode($response, true);
    echo "<pre>";
    print_r($data);
    echo "</pre>";
} else {
    echo "Error ($httpCode): $response";
}
?>
