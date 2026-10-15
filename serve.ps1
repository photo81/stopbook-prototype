# 스탑북 프로토타입 로컬 웹 서버 (추가 설치 없이 Windows PowerShell만 사용)
#   파일로 직접 열면(file://) 카카오 우편번호 검색 결과를 받을 수 없어서, 프로젝트 폴더를 http://localhost 주소로 열어 줌
#   실행: '프로토타입 실행.bat'을 더블클릭 (또는 powershell -ExecutionPolicy Bypass -File serve.ps1)
#   종료: 이 창을 닫거나 Ctrl+C
#   주의: 브라우저 저장소(localStorage)는 주소별로 따로라, 파일로 열었을 때 입력한 데이터는 여기서 보이지 않음
param([int]$Port = 8090, [string]$Start = 'admin/dashboard.html')

$root = (Split-Path -Parent $MyInvocation.MyCommand.Path).TrimEnd('\') + '\'
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'
  '.gif' = 'image/gif'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.webp' = 'image/webp'; '.pdf' = 'application/pdf'
  '.gs' = 'text/plain; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch { Write-Host "포트 $Port 을(를) 열 수 없습니다. 이미 실행 중이면 브라우저에서 http://localhost:$Port/ 로 여세요." -ForegroundColor Red; Read-Host '엔터를 누르면 닫힙니다'; exit 1 }

Write-Host ''
Write-Host '  스탑북 프로토타입 서버가 실행 중입니다. (이 창을 닫으면 종료)' -ForegroundColor Green
Write-Host "  관리자      http://localhost:$Port/admin/dashboard.html"
Write-Host "  회원가입    http://localhost:$Port/user/signup.html"
Write-Host "  마이페이지  http://localhost:$Port/user/mypage.html"
Write-Host ''
if ($Start -ne 'none') { Start-Process "http://localhost:$Port/$Start" }   # -Start none: 브라우저를 열지 않음

function Send($stream, [int]$code, [string]$status, [string]$type, [byte[]]$body) {
  $head = "HTTP/1.1 $code $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $h = [Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($h, 0, $h.Length)
  if ($body.Length) { $stream.Write($body, 0, $body.Length) }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
    $line = $reader.ReadLine()
    while ($true) { $h = $reader.ReadLine(); if ($null -eq $h -or $h -eq '') { break } }
    if (-not $line) { continue }
    $target = ($line -split ' ')[1]
    $path = [Uri]::UnescapeDataString(($target -split '[?#]')[0]).TrimStart('/').Replace('/', '\')
    if ($path -eq '') { $path = 'admin\dashboard.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $path))
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
      Send $stream 404 'Not Found' 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('404 Not Found'))
    } else {
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $type = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      Send $stream 200 'OK' $type ([IO.File]::ReadAllBytes($full))
    }
  } catch { } finally { $client.Close() }
}
