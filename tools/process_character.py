from PIL import Image

orig = Image.open("assets/axun-character.png").convert("RGBA")
user = Image.open("C:/Users/yoyo5/.gemini/antigravity/brain/b14d0624-d9c8-4807-825d-e55b149ae548/.user_uploaded/media_1789999376335.png").convert("RGBA")

# Let's inspect original bounds:
# Orig: canvas 1024 x 1536
# Bounding box: (65, 57, 970, 1484)
# Content height: 1427, width: 905
# Head top: y = 57 (0.037 * 1536)
# Feet bottom: y = 1484 (0.966 * 1536)

# User image:
# User: canvas 682 x 1024
# Bounding box: (43, 21, 609, 1011)
# Content height: 990, width: 566

# If we scale User content to match Orig content height:
# Scale factor = 1427 / 990 = 1.441414...
# Scaled user content width: 566 * 1.4414 = 815.8 (Orig content width is 905)
# If we position scaled user image on a 1024x1536 canvas:
# Target top = 57
# Target bottom = 1484
# Target horizontal center = 512 (or 517.5)

target_canvas_w = 1024
target_canvas_h = 1536

# Crop user image to its content bounding box
bbox = user.getbbox()
user_cropped = user.crop(bbox)

# Scale user_cropped so height is 1427
scale = 1427 / user_cropped.height
new_w = int(round(user_cropped.width * scale))
new_h = 1427

user_resized = user_cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

# Create 1024x1536 transparent canvas
canvas = Image.new("RGBA", (target_canvas_w, target_canvas_h), (0, 0, 0, 0))
# Center horizontally at 512, place feet at 1484 (y = 57)
pos_x = (target_canvas_w - new_w) // 2
pos_y = 57 # 57 + 1427 = 1484, exactly matches original feet bottom!

canvas.paste(user_resized, (pos_x, pos_y), user_resized)

canvas.save("assets/character.png")
print("Created aligned character.png: 1024x1536")
print("Target feet bottom:", pos_y + new_h, "Orig feet bottom:", 1484)
print("Target head top:", pos_y, "Orig head top:", 57)
print("Content center X:", pos_x + new_w/2, "Canvas center X:", target_canvas_w / 2)
