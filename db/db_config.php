<?php

$servername = "localhost"; // replace with your database server
$username = "root"; // replace with your database username
$password = ""; // replace with your database password
$dbname = "chatbot_db"; // replace with your database name

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}


// <?php 

// $servername = "localhost"; // replace with your database server
// $username = "julmyteam_julmyteam"; // replace with your database username
// $password = "4NUdQP*&j_ki"; // replace with your database password
// $dbname = "julmyteam_chatbotDB"; // replace with your database name

// // Create connection
// $conn = new mysqli($servername, $username, $password, $dbname);

// // Check connection
// if ($conn->connect_error) {
//   die("Connection failed: " . $conn->connect_error);
// }