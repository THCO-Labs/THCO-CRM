#!/usr/bin/env bash
# Rebuild the image in ACR and roll the Container App onto it.
#
# A manual stand-in for the GitHub Actions workflow, which cannot run until a
# service principal has Contributor on the resource group -- granting that
# needs Owner or User Access Administrator, which the current account lacks.
#
#   bash scripts/redeploy.sh
#
# Requires: az CLI, already logged in (`az login --use-device-code`).

set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-thco-crm}"
ACR="${ACR_NAME:-thcocrmacr13661}"
APP="${AZURE_CONTAINERAPP_NAME:-thco-crm}"
IMAGE="thco-crm"
TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"

echo "Building ${IMAGE}:${TAG} in ${ACR}..."
# `az acr build` can exit non-zero on Windows purely because its log streamer
# fails to encode a character the build printed, while the build itself
# succeeds. The run status is the authority, so the exit code is ignored here
# and the result is read back explicitly.
az acr build --registry "$ACR" --image "${IMAGE}:${TAG}" --image "${IMAGE}:latest" \
    --file Dockerfile . || true

status=$(az acr task list-runs --registry "$ACR" --top 1 --query '[0].status' -o tsv | tr -d '\r')
if [ "$status" != "Succeeded" ]; then
    echo "Build did not succeed (status: ${status}). Inspect with:"
    echo "  az acr task list-runs --registry ${ACR} --top 5 -o table"
    exit 1
fi
echo "Build succeeded."

echo "Rolling ${APP} onto the new image..."
az containerapp update --name "$APP" --resource-group "$RG" \
    --image "${ACR}.azurecr.io/${IMAGE}:${TAG}" --output none

fqdn=$(az containerapp show --name "$APP" --resource-group "$RG" \
    --query properties.configuration.ingress.fqdn -o tsv | tr -d '\r')

echo "Waiting for https://${fqdn}/healthz ..."
for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "https://${fqdn}/healthz" || true)
    if [ "$code" = "200" ]; then
        echo "Healthy. https://${fqdn}"
        exit 0
    fi
    echo "  attempt ${i}: HTTP ${code:-none}"
    sleep 10
done

echo "App did not become healthy within 5 minutes. Recent logs:"
az containerapp logs show --name "$APP" --resource-group "$RG" --tail 40 || true
exit 1
