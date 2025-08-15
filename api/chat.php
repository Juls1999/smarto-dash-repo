<?php
session_start();
header('Content-Type: application/json');

require_once "../db/db_config.php";

$accessKey = 'TYtPbvEH4Tbe0_Mh6bZ7lZHGxbuV1t-t';
$agentEndpoint = 'https://u67besvukawd2wjgnntfh4hr.agents.do-ai.run';
$apiUrl = "{$agentEndpoint}/api/v1/chat/completions";


// Load AI settings from DB (MySQLi)
$sql = "SELECT temperature, top_p, k, retrieval_method, frequency_penalty, instruction_override FROM ai_settings LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $settings = $result->fetch_assoc();
} else {
    // Fallback defaults if no settings found
    $settings = [
        'temperature' => 0.9,
        'top_p' => 0.9,
        'k' => 3,
        'retrieval_method' => 'none',
        'frequency_penalty' => 0.2,
        'instruction_override' => ''
    ];
}

$prompt = isset($_POST['prompt']) ? trim($_POST['prompt']) : '';
if (empty($prompt)) {
    echo json_encode(['error' => 'Prompt is required']);
    exit;
}

if (!isset($_SESSION['chat_history'])) {
    $_SESSION['chat_history'] = [];

    // // Add predefined system message to enforce grounding
    // $_SESSION['chat_history'][] = [
    //     'role' => 'system',
    //     'content' => $settings['instruction_override']
    // ];
}

$_SESSION['chat_history'][] = [
    'role' => 'user',
    'content' => $prompt
    // 'content' => "how to sync new email folder for user?"
];



$payload = [
    "messages" => $_SESSION['chat_history'],
    "max_tokens" => 512,

    "temperature" => (float) $settings['temperature'],
    "top_p" => (float) $settings['top_p'],
    "k" => (int) $settings['k'],
    "retrieval_method" => $settings['retrieval_method'],

    "frequency_penalty" => (float) $settings['frequency_penalty'],
    "instruction_override" => $settings['instruction_override'],
    "include_retrieval_info" => true,
    "include_guardrails_info" => true,
    "provide_citations" => true
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $accessKey",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $decoded = json_decode($response, true);

    // $fallbackMessages = [
    //     'sensitive_data_detection' => "I couldn’t respond to that request because it might involve sensitive or private information. If this is about a product feature, please rephrase or try being more specific.",
    //     'content_moderation' => "The content of your request may violate our Content Moderation guidelines. Please rephrase or ask about another topic."
    // ];

    $botMessage = $decoded['choices'][0]['message']['content'] ?? null;
    // $botMessage = $decoded ?? null;
    // $fallbackTriggered = false;

    // // Handle guardrails
    // if (!empty($decoded['guardrails']['triggered_guardrails'])) {
    //     foreach ($decoded['guardrails']['triggered_guardrails'] as $guardrail) {
    //         $rule = $guardrail['rule_name'] ?? '';
    //         if (isset($fallbackMessages[$rule])) {
    //             $botMessage = $fallbackMessages[$rule];
    //             $fallbackTriggered = true;
    //             break;
    //         }
    //     }
    // }

    // // Handle citation filtering ONLY IF no guardrail fallback was used
    // $citations = $decoded['citations']['citations'] ?? [];

    // if (!$fallbackTriggered && empty($citations)) {
    //     echo json_encode([
    //         'response' => "I'm here to assist based on our documentation, but I couldn't find relevant information for that request.",
    //         'citations' => []
    //     ]);
    //     exit;
    // }



    if ($botMessage) {
        $_SESSION['chat_history'][] = [
            'role' => 'assistant',
            'content' => $botMessage
        ];
    }


    $finalCitations = [];
    $titleUrlMap = []; // Store title => url mapping

    if (!empty($decoded['citations']['citations']) && is_array($decoded['citations']['citations'])) {
        foreach ($decoded['citations']['citations'] as $citation) {
            $referenceId = $citation['chunk_id'] ?? null;
            $pageContent = $citation['page_content'] ?? '';
            $title = 'Source';
            $url = null;

            // Extract title
            if (preg_match('/article_title:\s*(.*?)\s*source_url:/s', $pageContent, $titleMatch)) {
                $title = trim($titleMatch[1]);
            } elseif (!empty($citation['metadata']['item_name'])) {
                $title = str_replace(['.txt', '-', '_'], ['', ' ', ' '], $citation['metadata']['item_name']);
                $title = ucwords(trim($title));
            }

            // Try to extract source_url from page_content
            if (preg_match('/source_url:\s*(\S+)/', $pageContent, $urlMatch)) {
                $url = trim($urlMatch[1]);
                $titleUrlMap[$title] = $url; // Cache for fallback use
            } elseif (isset($titleUrlMap[$title])) {
                $url = $titleUrlMap[$title]; // Use cached URL from previous chunk
            } elseif (!empty($citation['filename'])) {
                // Attempt to reconstruct the URL from filename
                if (preg_match('#smarto-dash-bucket/([^/]+)/(.+)\.txt#', $citation['filename'], $m)) {
                    $domain = $m[1]; // e.g., www.crystaldash.com
                    $path = $m[2];   // e.g., 7-Factors-to-Consider...
                    $urlPath = str_replace('_', '-', $path); // optional: handle underscores as dashes
                    $url = 'https://' . $domain . '/' . $urlPath;
                } else {
                    $url = '#';
                }
            } else {
                $url = '#';
            }


            $finalCitations[] = [
                'title' => $title,
                'url' => $url,
                'score' => $citation['score'] ?? null,
                'reference_id' => $referenceId
            ];
        }
    }


    echo json_encode([
        'response' => $botMessage,
        'citations' => $finalCitations
    ]);



} else {
    echo json_encode([
        'error' => 'Request failed',
        'status' => $httpCode,
        'raw_response' => $response
    ]);
}