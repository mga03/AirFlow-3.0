#!/bin/bash

# Script para inicializar CouchDB con templates de prueba
# Uso: bash init-couchdb.sh

COUCHDB_URL="http://localhost:5984"
COUCHDB_USER="admin"
COUCHDB_PASSWORD="password"
DB_NAME="templates"

echo "Esperando a que CouchDB esté disponible..."
sleep 5

# Crear la base de datos 'templates'
echo "Creando base de datos '$DB_NAME'..."
curl -X PUT \
  -u ${COUCHDB_USER}:${COUCHDB_PASSWORD} \
  "${COUCHDB_URL}/${DB_NAME}"

echo -e "\nInsertando templates de prueba..."

# Template: informe_ventas
curl -X POST \
  -u ${COUCHDB_USER}:${COUCHDB_PASSWORD} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "informe_ventas",
    "reportName": "informe_ventas",
    "description": "Formulario para generar informe de ventas",
    "fields": [
      { "name": "fecha_inicio", "label": "Fecha de inicio", "type": "date" },
      { "name": "fecha_fin", "label": "Fecha de fin", "type": "date" },
      { "name": "region", "label": "Región", "type": "select", "options": ["Norte", "Sur", "Este", "Oeste"] },
      { "name": "top_n", "label": "Top N productos", "type": "number" }
    ]
  }' \
  "${COUCHDB_URL}/${DB_NAME}"

echo -e "\nTemplate informe_ventas creado."

# Template: reporte_usuarios
curl -X POST \
  -u ${COUCHDB_USER}:${COUCHDB_PASSWORD} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "reporte_usuarios",
    "reportName": "reporte_usuarios",
    "description": "Formulario para generar reporte de usuarios",
    "fields": [
      { "name": "fecha_desde", "label": "Desde fecha", "type": "date" },
      { "name": "estado", "label": "Estado del usuario", "type": "select", "options": ["Activo", "Inactivo", "Suspendido"] },
      { "name": "incluir_detalle", "label": "Incluir detalle", "type": "boolean" }
    ]
  }' \
  "${COUCHDB_URL}/${DB_NAME}"

echo -e "\nTemplate reporte_usuarios creado."

echo -e "\nInicialización de CouchDB completada."
