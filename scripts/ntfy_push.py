#!/usr/bin/env python3
"""
OSSUM COR - ntfy.sh Python Push Notification Helper
Permite despachar notificaciones con imágenes, prioridades y acciones interactivas a móviles y PCs.

Uso:
  python scripts/ntfy_push.py --topic ossum-coordinacion --title "Nueva Cirugía" --message "CX-005 asignada a Dr. Pérez"
"""

import sys
import json
import argparse
import urllib.request
import urllib.error


def send_ntfy(
    topic: str = "ossum-coordinacion",
    title: str = "Alerta OSSUM COR",
    message: str = "",
    priority: str = "default",
    tags: str = "hospital,clipboard",
    attach_url: str = None,
    action_url: str = None,
    action_label: str = "Ver en OSSUM",
    server_url: str = "https://ntfy.sh"
) -> bool:
    endpoint = f"{server_url.rstrip('/')}/{topic}"
    headers = {
        "Title": title.encode("utf-8"),
        "Priority": priority,
    }

    if tags:
        headers["Tags"] = tags
    if attach_url:
        headers["Attach"] = attach_url
    if action_url:
        headers["Actions"] = f"view, {action_label}, {action_url}"
        headers["Click"] = action_url

    req = urllib.request.Request(
        endpoint,
        data=message.encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print(f"[OK] Notificación enviada con éxito a {endpoint}")
                return True
            else:
                print(f"[ERR] Falló con código HTTP {response.status}")
                return False
    except urllib.error.HTTPError as e:
        print(f"[ERR] Error HTTP: {e.code} - {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        print(f"[ERR] Error inesperado: {e}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Despachar notificación ntfy.sh")
    parser.add_argument("--topic", default="ossum-coordinacion", help="Canal de ntfy (ej: ossum-coordinacion)")
    parser.add_argument("--title", default="Alerta de Coordinación", help="Título del mensaje")
    parser.add_argument("--message", required=True, help="Cuerpo del mensaje")
    parser.add_argument("--priority", default="high", choices=["min", "low", "default", "high", "urgent"], help="Prioridad")
    parser.add_argument("--tags", default="hospital,syringe", help="Tags/emojis separados por coma")
    parser.add_argument("--attach", default=None, help="URL de imagen o archivo adjunto")
    parser.add_argument("--action-url", default=None, help="URL que se abrirá al tocar la acción")

    args = parser.parse_args()

    send_ntfy(
        topic=args.topic,
        title=args.title,
        message=args.message,
        priority=args.priority,
        tags=args.tags,
        attach_url=args.attach,
        action_url=args.action_url
    )
