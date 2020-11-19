setlocal enabledelayedexpansion

SET CertPath=%USERPROFILE%\.aspnet\https

dotnet dev-certs https --clean
dotnet dev-certs https -ep %CertPath%\momentum_localhost.pfx -p MoMenTumManIsCOmInG
dotnet dev-certs https --trust

@echo off

rem Read the Git for Windows installation path from the Registry.
for %%k in (HKCU HKLM) do (
    for %%w in (\ \Wow6432Node\) do (
        for /f "skip=2 delims=: tokens=1*" %%a in ('reg query "%%k\SOFTWARE%%wMicrosoft\Windows\CurrentVersion\Uninstall\Git_is1" /v InstallLocation 2^> nul') do (
            for /f "tokens=3" %%z in ("%%a") do (
                set GIT=%%z:%%b
                echo Found Git at "!GIT!".
                goto FOUND
            )
        )
    )
)

goto NOT_FOUND

:FOUND

rem Make sure Bash is in PATH (for running scripts).
set PATH=%GIT%mingw64\bin;%PATH%

openssl.exe pkcs12 -in %CertPath%\momentum_localhost.pfx -nocerts -out %CertPath%\momentum_localhost.encrypted.key -passin pass:MoMenTumManIsCOmInG -passout pass:MoMenTumManIsCOmInG
openssl.exe rsa -in %CertPath%\momentum_localhost.encrypted.key -out %CertPath%\momentum_localhost.key -passin pass:MoMenTumManIsCOmInG -passout pass:MoMenTumManIsCOmInG
DEL %CertPath%\momentum_localhost.encrypted.key
openssl.exe pkcs12 -in %CertPath%\momentum_localhost.pfx -clcerts -nokeys -out %CertPath%\momentum_localhost.tld.crt -passin pass:MoMenTumManIsCOmInG -passout pass:MoMenTumManIsCOmInG
openssl.exe pkcs12 -in %CertPath%\momentum_localhost.pfx -cacerts -out %CertPath%\momentum_localhost.bundle.crt -passin pass:MoMenTumManIsCOmInG -passout pass:MoMenTumManIsCOmInG
COPY %CertPath%\momentum_localhost.tld.crt+%CertPath%\momentum_localhost.bundle.crt %CertPath%\momentum_localhost.crt
DEL %CertPath%\momentum_localhost.tld.crt
DEL %CertPath%\momentum_localhost.bundle.crt


:NOT_FOUND

rem Git not found, are you on Windows?

pause