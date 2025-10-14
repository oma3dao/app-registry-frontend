#!/bin/bash
# Generate a random SIWE server secret for local development

echo "Generating SIWE server secret for local development..."
echo ""

# Generate and save to SSH folder
openssl rand -base64 32 > ~/.ssh/siwe-server-secret
chmod 600 ~/.ssh/siwe-server-secret

echo "✅ Secret saved to ~/.ssh/siwe-server-secret"
echo ""
echo "For deployment (Vercel), set environment variable:"
echo "SIWE_SERVER_SECRET=$(cat ~/.ssh/siwe-server-secret)"
echo ""
echo "This secret is used to sign SIWE nonces for stateless authentication."
