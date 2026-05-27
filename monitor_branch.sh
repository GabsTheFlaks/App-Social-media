#!/bin/bash

REPO_URL="https://github.com/GabsTheFlaks/App-Social-media.git"
BRANCHES=("fix/security" "feat/pwa" "refactor/upload" "feat/quality")
INTERVAL=60 # Segundos

echo "Iniciando monitoramento de múltiplas branches no repositório $REPO_URL..."
echo "Verificação a cada $INTERVAL segundos."

while true; do
  DATE=$(date '+%Y-%m-%d %H:%M:%S')
  ALL_EXIST=true

  echo "[$DATE] Verificando branches..."

  for BRANCH in "${BRANCHES[@]}"; do
    RESULT=$(git ls-remote --heads "$REPO_URL" "$BRANCH")
    if [ -z "$RESULT" ]; then
      echo "  - Branch '$BRANCH' AINDA NÃO existe."
      ALL_EXIST=false
    else
      echo "  - Branch '$BRANCH' detectada! (OK)"
    fi
  done

  if [ "$ALL_EXIST" = true ]; then
    echo "[$DATE] SUCESSO! Todas as branches foram detectadas no repositório remoto!"
    echo "Você pode avisar o agente para continuar com o merge."
    break
  else
    echo "[$DATE] Algumas branches ainda faltam. Tentando novamente em $INTERVAL segundos..."
  fi

  sleep $INTERVAL
done
