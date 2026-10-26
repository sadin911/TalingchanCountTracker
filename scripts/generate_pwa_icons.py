import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # Create image with RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale helper
    def s(val):
        return int(val * size / 512)
    
    # Outer rounded rectangle (Dark cosmic background)
    pad = s(16)
    radius = s(96)
    draw.rounded_rectangle(
        [(pad, pad), (size - pad, size - pad)],
        radius=radius,
        fill=(13, 15, 23, 255),
        outline=(225, 29, 72, 255), # Rose-600 outline
        width=s(8)
    )
    
    # Inner border / glow
    inner_pad = s(36)
    inner_radius = s(76)
    draw.rounded_rectangle(
        [(inner_pad, inner_pad), (size - inner_pad, size - inner_pad)],
        radius=inner_radius,
        outline=(245, 158, 11, 200), # Amber-500 glow
        width=s(4)
    )
    
    # Card shape emblem in center
    cw = s(200)
    ch = s(280)
    cx = size // 2
    cy = size // 2
    card_box = [(cx - cw // 2, cy - ch // 2), (cx + cw // 2, cy + ch // 2)]
    
    draw.rounded_rectangle(
        card_box,
        radius=s(24),
        fill=(23, 27, 44, 255),
        outline=(244, 63, 94, 255), # Rose-500
        width=s(6)
    )
    
    # Inner decorative lines on card
    draw.line([(cx - cw // 2 + s(16), cy - ch // 2 + s(40)), (cx + cw // 2 - s(16), cy - ch // 2 + s(40))], fill=(245, 158, 11, 255), width=s(3))
    draw.line([(cx - cw // 2 + s(16), cy + ch // 2 - s(30)), (cx + cw // 2 - s(16), cy + ch // 2 - s(30))], fill=(245, 158, 11, 255), width=s(3))

    # Center circle talisman
    talisman_radius = s(48)
    draw.ellipse(
        [(cx - talisman_radius, cy - talisman_radius), (cx + talisman_radius, cy + talisman_radius)],
        fill=(225, 29, 72, 220), # Rose
        outline=(251, 191, 36, 255), # Gold
        width=s(4)
    )
    
    # Try to load a nice font, or draw stylized 'T'
    # Draw stylized capital 'T' or sword / emblem
    # Stylized 'T'
    bar_w = s(44)
    bar_h = s(10)
    draw.rectangle([(cx - bar_w // 2, cy - s(22)), (cx + bar_w // 2, cy - s(22) + bar_h)], fill=(255, 255, 255, 255))
    stem_w = s(10)
    stem_h = s(42)
    draw.rectangle([(cx - stem_w // 2, cy - s(22)), (cx + stem_w // 2, cy - s(22) + stem_h)], fill=(255, 255, 255, 255))
    
    return img

def main():
    os.makedirs("public", exist_ok=True)
    
    icon_512 = create_icon(512)
    icon_512.save("public/pwa-512x512.png", "PNG")
    print("Saved public/pwa-512x512.png")
    
    icon_192 = icon_512.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save("public/pwa-192x192.png", "PNG")
    print("Saved public/pwa-192x192.png")
    
    icon_apple = icon_512.resize((180, 180), Image.Resampling.LANCZOS)
    icon_apple.save("public/apple-touch-icon.png", "PNG")
    print("Saved public/apple-touch-icon.png")

if __name__ == "__main__":
    main()
