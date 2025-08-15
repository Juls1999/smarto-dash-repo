<?php
// destroy_session.php

// session_start(); // Start the session
// session_unset(); // Clear all session variables
// session_destroy(); // Destroy the session

session_start();
unset($_SESSION['chat_history']);

// // You can optionally redirect the user to a specific page or provide a message indicating successful session destruction
echo json_encode(['message' => 'Session destroyed successfully']);