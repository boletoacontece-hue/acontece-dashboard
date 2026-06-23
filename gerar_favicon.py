#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de Favicon - Acontece Visitas
Gera o favicon.ico a partir do Logo01.png
"""

from PIL import Image
import os
import sys

# Configurar encoding para UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Caminhos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.join(BASE_DIR, 'Logo01.png')
FAVICON_PATH = os.path.join(BASE_DIR, 'favicon.ico')

def gerar_favicon():
    """Gera o favicon.ico a partir do logo"""
    
    # Verificar se o logo existe
    if not os.path.exists(LOGO_PATH):
        print(f"[ERRO] Logo nao encontrado em {LOGO_PATH}")
        return False
    
    # Abrir logo original
    try:
        logo = Image.open(LOGO_PATH)
        print(f"[OK] Logo carregado: {logo.size[0]}x{logo.size[1]}px")
    except Exception as e:
        print(f"[ERRO] Erro ao abrir logo: {e}")
        return False
    
    # Gerar favicon com múltiplos tamanhos (16x16, 32x32, 48x48)
    try:
        favicon_sizes = [(16, 16), (32, 32), (48, 48)]
        favicon_images = []
        
        for size in favicon_sizes:
            icon = logo.resize(size, Image.Resampling.LANCZOS)
            favicon_images.append(icon)
            print(f"  [OK] Favicon {size[0]}x{size[1]}px gerado")
        
        # Salvar como .ico com múltiplos tamanhos
        favicon_images[0].save(
            FAVICON_PATH,
            format='ICO',
            sizes=favicon_sizes,
            append_images=favicon_images[1:]
        )
        
        print(f"\n[SUCESSO] Favicon gerado com sucesso!")
        print(f"[INFO] Localizacao: {FAVICON_PATH}")
        return True
        
    except Exception as e:
        print(f"[ERRO] Erro ao gerar favicon: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("GERADOR DE FAVICON - ACONTECE VISITAS")
    print("=" * 60)
    print()
    
    sucesso = gerar_favicon()
    
    if sucesso:
        print("\n" + "=" * 60)
        print("[CONCLUIDO] Favicon gerado com sucesso!")
        print("=" * 60)
    else:
        print("\n[FALHA] Falha ao gerar favicon")
