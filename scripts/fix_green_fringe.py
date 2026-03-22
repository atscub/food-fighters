import numpy as np
from PIL import Image
from pathlib import Path
from scipy import ndimage

sprites_dir = Path("/home/abraham/Personal/self-bootstrap/public/assets/sprites")

for png_path in sorted(sprites_dir.glob("*.png")):
    img = Image.open(png_path).convert("RGBA")
    data = np.array(img, dtype=np.float64)

    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # Step 1: Remove pixels very close to pure green (#00FF00)
    green_dist = np.sqrt(r**2 + (g - 255)**2 + b**2)
    near_green = (green_dist < 120) & (a > 0)
    data[near_green] = [0, 0, 0, 0]

    # Step 2: Desaturate remaining green-heavy pixels (fringe bleed)
    a = data[:,:,3]
    visible = a > 0
    green_heavy = (
        visible
        & (data[:,:,1] > data[:,:,0] * 1.2)
        & (data[:,:,1] > data[:,:,2] * 1.2)
        & (data[:,:,1] > 80)
    )
    if np.any(green_heavy):
        avg_rb = (data[green_heavy, 0] + data[green_heavy, 2]) / 2
        data[green_heavy, 1] = np.minimum(data[green_heavy, 1], avg_rb + 10)

    # Step 3: Erode alpha edges by 1 pixel to soften remaining fringe
    alpha_binary = (data[:,:,3] > 0).astype(np.float64)
    eroded = ndimage.binary_erosion(alpha_binary, iterations=1)
    edge_mask = alpha_binary.astype(bool) & ~eroded
    data[edge_mask, 3] = data[edge_mask, 3] * 0.5

    result = Image.fromarray(data.astype(np.uint8))
    result.save(png_path)
    print(f"Fixed: {png_path.name}")

print("Done.")
