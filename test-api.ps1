# ===========================================
# Pinterest Automation Platform - API Test Script
# ===========================================
# Usage: Start server first (npm start), then run:
#   .\test-api.ps1
# ===========================================

$base = "http://localhost:3000/api"
$ct = "application/json"
$pass = 0
$fail = 0

function Test-Endpoint {
  param($Name, $ScriptBlock)
  try {
    $result = & $ScriptBlock
    Write-Host "  PASS: $Name" -ForegroundColor Green
    $script:pass++
    return $result
  } catch {
    Write-Host "  FAIL: $Name - $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
    return $null
  }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  API Test Suite" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- Health Check ---
Write-Host "[Health]" -ForegroundColor Yellow
Test-Endpoint "GET /health returns ok" {
  $r = Invoke-RestMethod http://localhost:3000/health
  if ($r.status -ne "ok") { throw "Expected status ok" }
}

# --- Auth: Register ---
Write-Host "`n[Auth - Register]" -ForegroundColor Yellow
$user = Test-Endpoint "POST /auth/register creates user" {
  Invoke-RestMethod -Uri "$base/auth/register" -Method POST -Body '{"email":"testuser@example.com","password":"securePass123"}' -ContentType $ct
}

Test-Endpoint "POST /auth/register rejects duplicate email (409)" {
  try {
    Invoke-RestMethod -Uri "$base/auth/register" -Method POST -Body '{"email":"testuser@example.com","password":"securePass123"}' -ContentType $ct
    throw "Should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode -ne "Conflict") { throw "Expected 409 Conflict, got $($_.Exception.Response.StatusCode)" }
  }
}

Test-Endpoint "POST /auth/register rejects short password (400)" {
  try {
    Invoke-RestMethod -Uri "$base/auth/register" -Method POST -Body '{"email":"bad@test.com","password":"short"}' -ContentType $ct
    throw "Should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode -ne "BadRequest") { throw "Expected 400" }
  }
}

Test-Endpoint "POST /auth/register rejects invalid email (400)" {
  try {
    Invoke-RestMethod -Uri "$base/auth/register" -Method POST -Body '{"email":"not-an-email","password":"securePass123"}' -ContentType $ct
    throw "Should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode -ne "BadRequest") { throw "Expected 400" }
  }
}

# --- Auth: Login ---
Write-Host "`n[Auth - Login]" -ForegroundColor Yellow
$login = Test-Endpoint "POST /auth/login returns token" {
  $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"email":"testuser@example.com","password":"securePass123"}' -ContentType $ct
  if (-not $r.token) { throw "No token returned" }
  $r
}

Test-Endpoint "POST /auth/login rejects wrong password (401)" {
  try {
    Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"email":"testuser@example.com","password":"wrongpassword"}' -ContentType $ct
    throw "Should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode -ne "Unauthorized") { throw "Expected 401" }
  }
}

$h = @{ Authorization = "Bearer $($login.token)" }

# --- Auth: Protected Routes ---
Write-Host "`n[Auth - Protection]" -ForegroundColor Yellow
Test-Endpoint "GET /projects without token returns 401" {
  try {
    Invoke-RestMethod -Uri "$base/projects" -Method GET
    throw "Should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode -ne "Unauthorized") { throw "Expected 401" }
  }
}

Test-Endpoint "GET /projects with bad token returns 401" {
  try {
    Invoke-RestMethod -Uri "$base/projects" -Method GET -Headers @{ Authorization = "Bearer bad.token.here" }
    throw "Should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode -ne "Unauthorized") { throw "Expected 401" }
  }
}

# --- Projects: CRUD ---
Write-Host "`n[Projects]" -ForegroundColor Yellow
$proj = Test-Endpoint "POST /projects creates project" {
  $r = Invoke-RestMethod -Uri "$base/projects" -Method POST -Body '{"name":"My WordPress Blog","wp_api_url":"https://myblog.com/wp-json/wp/v2","wp_username":"admin","wp_app_password":"xxxx xxxx xxxx xxxx"}' -ContentType $ct -Headers $h
  if (-not $r.id) { throw "No project ID" }
  if ($r.wp_app_password) { throw "wp_app_password should NOT be in response" }
  $r
}

Test-Endpoint "GET /projects lists user projects" {
  $raw = Invoke-WebRequest -Uri "$base/projects" -Method GET -Headers $h
  $list = $raw.Content | ConvertFrom-Json
  if ($list.Count -lt 1) { throw "Expected at least 1 project" }
}

Test-Endpoint "GET /projects/:id returns single project" {
  $r = Invoke-RestMethod -Uri "$base/projects/$($proj.id)" -Method GET -Headers $h
  if ($r.name -ne "My WordPress Blog") { throw "Wrong project name" }
}

Test-Endpoint "PUT /projects/:id updates project" {
  $r = Invoke-RestMethod -Uri "$base/projects/$($proj.id)" -Method PUT -Body '{"name":"Updated Blog Name"}' -ContentType $ct -Headers $h
  if ($r.name -ne "Updated Blog Name") { throw "Name not updated" }
}

# --- Jobs: CRUD ---
Write-Host "`n[Jobs]" -ForegroundColor Yellow
$job = Test-Endpoint "POST /projects/:id/jobs creates job with pending status" {
  $r = Invoke-RestMethod -Uri "$base/projects/$($proj.id)/jobs" -Method POST -Body '{"type":"content_generation","description":"Test job"}' -ContentType $ct -Headers $h
  if ($r.status -ne "pending") { throw "Expected status pending, got $($r.status)" }
  $r
}

Test-Endpoint "GET /projects/:id/jobs lists jobs" {
  $raw = Invoke-WebRequest -Uri "$base/projects/$($proj.id)/jobs" -Method GET -Headers $h
  $list = $raw.Content | ConvertFrom-Json
  if ($list.Count -lt 1) { throw "Expected at least 1 job" }
}

Test-Endpoint "GET /projects/:id/jobs/:jobId returns single job" {
  $r = Invoke-RestMethod -Uri "$base/projects/$($proj.id)/jobs/$($job.id)" -Method GET -Headers $h
  if ($r.type -ne "content_generation") { throw "Wrong job type" }
}

Test-Endpoint "DELETE /projects/:id/jobs/:jobId deletes job" {
  $r = Invoke-RestMethod -Uri "$base/projects/$($proj.id)/jobs/$($job.id)" -Method DELETE -Headers $h
  if ($r.message -ne "Job deleted successfully") { throw "Wrong message" }
}

# --- Cleanup: Delete project ---
Test-Endpoint "DELETE /projects/:id deletes project" {
  $r = Invoke-RestMethod -Uri "$base/projects/$($proj.id)" -Method DELETE -Headers $h
  if ($r.message -ne "Project deleted successfully") { throw "Wrong message" }
}

# --- Results ---
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan
