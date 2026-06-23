#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de Icones PWA - Acontece Visitas
Gera todos os tamanhos de icones necessarios a partir do Logo01.png
"""

from PIL import Image
import os
import sys

# Configurar encoding para UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Tamanhos necessarios conforme manifest.json
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# Caminhos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.join(BASE_DIR, 'Logo01.png')
ICONS_DIR = os.path.join(BASE_DIR, 'icons')

def gerar_icones():
    """Gera todos os icones PWA a partir do logo"""
    
    # Verificar se o logo existe
    if not os.path.exists(LOGO_PATH):
        print(f"[ERRO] Logo nao encontrado em {LOGO_PATH}")
        return False
    
    # Criar pasta icons se nao existir
    if not os.path.exists(ICONS_DIR):
        os.makedirs(ICONS_DIR)
        print(f"[OK] Pasta 'icons/' criada")
    
    # Abrir logo original
    try:
        logo = Image.open(LOGO_PATH)
        print(f"[OK] Logo carregado: {logo.size[0]}x{logo.size[1]}px")
    except Exception as e:
        print(f"[ERRO] Erro ao abrir logo: {e}")
        return False
    
    # Gerar cada tamanho
    print(f"\n[PROCESSANDO] Gerando {len(SIZES)} icones...")
    for size in SIZES:
        try:
            # Redimensionar com alta qualidade
            icon = logo.resize((size, size), Image.Resampling.LANCZOS)
            
            # Salvar como PNG
            output_path = os.path.join(ICONS_DIR, f'icon-{size}.png')
            icon.save(output_path, 'PNG', optimize=True)
            
            print(f"  [OK] icon-{size}.png ({size}x{size}px)")
        except Exception as e:
            print(f"  [ERRO] Erro ao gerar icon-{size}.png: {e}")
            return False
    
    print(f"\n[SUCESSO] Todos os icones foram gerados com sucesso!")
    print(f"[INFO] Localizacao: {ICONS_DIR}")
    return True

if __name__ == '__main__':
    print("=" * 60)
    print("GERADOR DE ICONES PWA - ACONTECE VISITAS")
    print("=" * 60)
    print()
    
    sucesso = gerar_icones()
    
    if sucesso:
        print("\n" + "=" * 60)
        print("[CONCLUIDO] Processo finalizado com sucesso!")
        print("=" * 60)
        print("\nProximos passos:")
        print("1. Verificar a pasta 'icons/' com os 8 icones gerados")
        print("2. Fazer commit de todos os arquivos no Git")
        print("3. Enviar para o repositorio GitHub")
    else:
        print("\n[FALHA] Falha ao gerar icones")
        print("\nSolucao alternativa:")
        print("1. Abrir 'gerador-icones.html' no navegador")
        print("2. Arrastar o Logo01.png")
        print("3. Baixar o ZIP gerado")
        print("4. Extrair na pasta 'icons/'")
