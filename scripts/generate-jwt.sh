#!/bin/bash

# Simple JWT generator for local testing
# Usage: ./scripts/generate-jwt.sh [subject]

SUBJECT=${1:-"demo-user"}

HEADER='{"alg":"HS256","typ":"JWT"}'
CLAIMS=$(cat <<EOF
{
  "sub":"$SUBJECT",
  "iss":"suomifi-stub",
  "aud":"demo-client-id",
  "exp":9999999999,
  "iat":$(date +%s)
}
EOF
)

ENCODED_HEADER=$(echo -n "$HEADER" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
ENCODED_CLAIMS=$(echo -n "$CLAIMS" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')

# For demo, we don't sign it (production would use HMAC or RSA)
TOKEN="$ENCODED_HEADER.$ENCODED_CLAIMS.signature-placeholder"

echo "Generated JWT token:"
echo "$TOKEN"
echo ""
echo "Use it with curl:"
echo "curl -H 'Authorization: Bearer $TOKEN' http://localhost:8080/api/v1/profile"
