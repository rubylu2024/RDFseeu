<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => '只支持 POST 请求'
    ]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$username = isset($input['username']) ? trim($input['username']) : '';
$email = isset($input['email']) ? trim($input['email']) : '';
$password = isset($input['password']) ? $input['password'] : '';

if (empty($username) || empty($email) || empty($password)) {
    echo json_encode([
        'success' => false,
        'message' => '用户名、邮箱和密码不能为空'
    ]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'success' => false,
        'message' => '邮箱格式不正确'
    ]);
    exit;
}

if (strlen($username) < 3 || strlen($username) > 30) {
    echo json_encode([
        'success' => false,
        'message' => '用户名长度必须在3-30个字符之间'
    ]);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode([
        'success' => false,
        'message' => '密码长度不能少于6个字符'
    ]);
    exit;
}

$flarumBaseUrl = 'http://localhost/';
$apiUrl = rtrim($flarumBaseUrl, '/') . '/api/users';

$postData = json_encode([
    'data' => [
        'type' => 'users',
        'attributes' => [
            'username' => $username,
            'email' => $email,
            'password' => $password
        ]
    ]
]);

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/vnd.api+json',
    'Accept: application/vnd.api+json',
    'X-Requested-With: XMLHttpRequest'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 3);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode([
        'success' => false,
        'message' => '无法连接到论坛服务器：' . $error
    ]);
    exit;
}

$responseData = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode([
        'success' => true
    ]);
} else {
    $errorMessage = '注册失败';
    if (isset($responseData['errors']) && is_array($responseData['errors'])) {
        $errorDetail = [];
        foreach ($responseData['errors'] as $err) {
            if (isset($err['detail'])) {
                $errorDetail[] = $err['detail'];
            }
        }
        if (!empty($errorDetail)) {
            $errorMessage = implode('; ', $errorDetail);
        }
    } elseif (isset($responseData['message'])) {
        $errorMessage = $responseData['message'];
    }
    echo json_encode([
        'success' => false,
        'message' => $errorMessage
    ]);
}
