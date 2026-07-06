param(
    [int]$Port = 4173
)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootFull = [System.IO.Path]::GetFullPath($Root)
$RootCheck = $RootFull
if (-not $RootCheck.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $RootCheck += [System.IO.Path]::DirectorySeparatorChar
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".svg" = "image/svg+xml"
    ".png" = "image/png"
    ".txt" = "text/plain; charset=utf-8"
}

function Write-HttpResponse {
    param(
        [System.IO.Stream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$Body,
        [bool]$HeadOnly = $false
    )

    if ($null -eq $Body) {
        $Body = [byte[]]::new(0)
    }

    $Header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $HeaderBytes = [System.Text.Encoding]::UTF8.GetBytes($Header)
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)

    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
}

$Address = [System.Net.IPAddress]::Parse("127.0.0.1")
$Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)
$Listener.Start()

Write-Host "Memory Card Trainer is running at http://localhost:$Port/"
Write-Host "Press Ctrl+C to stop."

try {
    while ($true) {
        $Client = $Listener.AcceptTcpClient()

        try {
            $Stream = $Client.GetStream()
            $Reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $RequestLine = $Reader.ReadLine()

            do {
                $HeaderLine = $Reader.ReadLine()
            } while ($null -ne $HeaderLine -and $HeaderLine.Length -gt 0)

            if ([string]::IsNullOrWhiteSpace($RequestLine)) {
                Write-HttpResponse $Stream 400 "Bad Request" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Bad Request"))
                continue
            }

            $Parts = $RequestLine.Split(" ")
            $Method = $Parts[0].ToUpperInvariant()
            if ($Method -ne "GET" -and $Method -ne "HEAD") {
                Write-HttpResponse $Stream 405 "Method Not Allowed" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed"))
                continue
            }

            $UrlPath = ($Parts[1] -split "\?")[0]
            $RequestPath = [System.Uri]::UnescapeDataString($UrlPath.TrimStart("/"))
            if ([string]::IsNullOrWhiteSpace($RequestPath)) {
                $RequestPath = "index.html"
            }

            $RequestPath = $RequestPath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $TargetPath = [System.IO.Path]::GetFullPath((Join-Path $RootFull $RequestPath))

            if (-not $TargetPath.StartsWith($RootCheck, [System.StringComparison]::OrdinalIgnoreCase)) {
                Write-HttpResponse $Stream 403 "Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden")) ($Method -eq "HEAD")
                continue
            }

            if ([System.IO.Directory]::Exists($TargetPath)) {
                $TargetPath = Join-Path $TargetPath "index.html"
            }

            if (-not [System.IO.File]::Exists($TargetPath)) {
                Write-HttpResponse $Stream 404 "Not Found" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Not Found")) ($Method -eq "HEAD")
                continue
            }

            $Extension = [System.IO.Path]::GetExtension($TargetPath).ToLowerInvariant()
            $ContentType = if ($MimeTypes.ContainsKey($Extension)) { $MimeTypes[$Extension] } else { "application/octet-stream" }
            $Bytes = [System.IO.File]::ReadAllBytes($TargetPath)
            Write-HttpResponse $Stream 200 "OK" $ContentType $Bytes ($Method -eq "HEAD")
        }
        catch {
            if ($null -ne $Stream) {
                Write-HttpResponse $Stream 500 "Internal Server Error" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Internal Server Error"))
            }
        }
        finally {
            if ($null -ne $Reader) {
                $Reader.Dispose()
            }
            $Client.Close()
        }
    }
}
finally {
    $Listener.Stop()
}
