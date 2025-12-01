#!/bin/bash
# Test avatar API endpoint

echo "Testing Avatar API..."
echo ""
echo "GET /api/avatar/ (should return 401 without auth)"
curl -i http://localhost:8000/api/avatar/ 2>&1 | head -n 20

