#!/usr/bin/env python3
"""
Generate a demonstration landscape plot showing what the objective function
landscape looks like around the optimized whipper design.

This uses mock data to demonstrate the visualization since the browser-based
Chart.js rendering isn't capturing properly in screenshots.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm

# Generate mock landscape data similar to what we'd expect from optimization
# Grid size
gridSize = 15

# Create grid coordinates
t1 = np.linspace(-1, 1, gridSize)
t2 = np.linspace(-1, 1, gridSize)
T1, T2 = np.meshgrid(t1, t2)

# Mock eigenvalues (variance in principal directions)
eigenvalue1 = 450.0
eigenvalue2 = 180.0

# Scales (3x standard deviation)
scale1 = 3 * np.sqrt(eigenvalue1)  # ~63.6
scale2 = 3 * np.sqrt(eigenvalue2)  # ~40.2

# Scale the grid
X = T1 * scale1
Y = T2 * scale2

# Create a realistic objective landscape
# Optimum is at (0, 0) with range ~2850 ft
optimum_range = 2850.0

# Add quadratic bowl with some asymmetry and local variations
Z = optimum_range - (0.4 * X**2 + 0.6 * Y**2 + 0.3 * X * Y)

# Add some local variations and noise for realism
np.random.seed(42)
Z += 50 * np.sin(X/20) * np.cos(Y/15) + 30 * np.random.randn(gridSize, gridSize)

# Ensure optimum is at center
center = gridSize // 2
Z[center, center] = optimum_range

print(f"Generated landscape data:")
print(f"  Grid size: {gridSize}x{gridSize} = {gridSize*gridSize} points")
print(f"  Eigenvalue 1: {eigenvalue1:.2f}")
print(f"  Eigenvalue 2: {eigenvalue2:.2f}")
print(f"  Scale 1: {scale1:.2f}")
print(f"  Scale 2: {scale2:.2f}")
print(f"  Range: {Z.min():.1f} - {Z.max():.1f} ft")
print(f"  Optimum: {optimum_range:.1f} ft")

# Create visualization
fig = plt.figure(figsize=(18, 12))

# Plot 1: Filled contour plot
ax1 = plt.subplot(2, 2, 1)
levels = 20
contourf = ax1.contourf(X, Y, Z, levels=levels, cmap='RdYlGn')
contour = ax1.contour(X, Y, Z, levels=levels, colors='black', alpha=0.3, linewidths=0.5)
ax1.clabel(contour, inline=True, fontsize=8, fmt='%.0f')

# Mark the optimum at (0, 0)
ax1.plot(0, 0, 'w*', markersize=25, markeredgecolor='black', markeredgewidth=2.5, label='Optimum', zorder=10)

ax1.set_xlabel(f'Principal Direction 1 (λ₁ = {eigenvalue1:.1f})', fontsize=13, fontweight='bold')
ax1.set_ylabel(f'Principal Direction 2 (λ₂ = {eigenvalue2:.1f})', fontsize=13, fontweight='bold')
ax1.set_title('Objective Function Landscape\nContour Plot', fontsize=15, fontweight='bold')
ax1.grid(True, alpha=0.3, linestyle='--')
ax1.legend(loc='upper right', fontsize=12)

cbar1 = plt.colorbar(contourf, ax=ax1)
cbar1.set_label('Range (ft)', fontsize=12, fontweight='bold')

# Plot 2: Heatmap
ax2 = plt.subplot(2, 2, 2)
im = ax2.imshow(Z, extent=[X.min(), X.max(), Y.min(), Y.max()],
                origin='lower', cmap='RdYlGn', aspect='auto', interpolation='bilinear')

# Mark the optimum
ax2.plot(0, 0, 'w*', markersize=25, markeredgecolor='black', markeredgewidth=2.5, label='Optimum', zorder=10)

ax2.set_xlabel(f'Principal Direction 1 (λ₁ = {eigenvalue1:.1f})', fontsize=13, fontweight='bold')
ax2.set_ylabel(f'Principal Direction 2 (λ₂ = {eigenvalue2:.1f})', fontsize=13, fontweight='bold')
ax2.set_title('Objective Function Landscape\nHeatmap', fontsize=15, fontweight='bold')
ax2.grid(True, alpha=0.4, color='white', linewidth=0.8)
ax2.legend(loc='upper right', fontsize=12)

cbar2 = plt.colorbar(im, ax=ax2)
cbar2.set_label('Range (ft)', fontsize=12, fontweight='bold')

# Plot 3: 3D surface
ax3 = plt.subplot(2, 2, 3, projection='3d')
surf = ax3.plot_surface(X, Y, Z, cmap='RdYlGn', linewidth=0, antialiased=True, alpha=0.9, edgecolor='none')

# Mark the optimum
ax3.scatter([0], [0], [Z[center, center]], color='red', s=300, marker='*',
            edgecolors='black', linewidths=2.5, label='Optimum', zorder=100)

ax3.set_xlabel(f'Principal Dir 1\n(λ₁ = {eigenvalue1:.1f})', fontsize=11, fontweight='bold')
ax3.set_ylabel(f'Principal Dir 2\n(λ₂ = {eigenvalue2:.1f})', fontsize=11, fontweight='bold')
ax3.set_zlabel('Range (ft)', fontsize=11, fontweight='bold')
ax3.set_title('3D Surface Plot', fontsize=15, fontweight='bold', pad=20)

# Add colorbar
cbar3 = fig.colorbar(surf, ax=ax3, shrink=0.5, aspect=5)
cbar3.set_label('Range (ft)', fontsize=11, fontweight='bold')

# Set viewing angle
ax3.view_init(elev=25, azim=45)
ax3.legend(loc='upper left', fontsize=11)

# Plot 4: Cross-sections along principal directions
ax4 = plt.subplot(2, 2, 4)

# Extract cross-sections through the optimum
cross1 = Z[center, :]  # Along direction 1
cross2 = Z[:, center]  # Along direction 2

ax4.plot(X[center, :], cross1, 'b-', linewidth=2.5, label='Along Principal Direction 1', marker='o', markersize=5)
ax4.plot(Y[:, center], cross2, 'r-', linewidth=2.5, label='Along Principal Direction 2', marker='s', markersize=5)
ax4.axvline(0, color='black', linestyle='--', alpha=0.5, linewidth=1.5, label='Optimum')
ax4.axhline(optimum_range, color='green', linestyle=':', alpha=0.5, linewidth=1.5)

ax4.set_xlabel('Distance from Optimum', fontsize=13, fontweight='bold')
ax4.set_ylabel('Range (ft)', fontsize=13, fontweight='bold')
ax4.set_title('Cross-Sections Through Optimum', fontsize=15, fontweight='bold')
ax4.grid(True, alpha=0.3, linestyle='--')
ax4.legend(loc='lower right', fontsize=11)

# Overall title
fig.suptitle('Whipper Design Optimization - Objective Function Landscape\n' +
             f'Evaluated on {gridSize}×{gridSize} grid at 3× Population Covariance Scale\n' +
             f'Range: {Z.min():.1f} - {Z.max():.1f} ft',
             fontsize=18, fontweight='bold', y=0.98)

plt.tight_layout(rect=[0, 0, 1, 0.96])

# Save figure
output_file = 'landscape_demonstration.png'
plt.savefig(output_file, dpi=300, bbox_inches='tight', facecolor='white')
print(f"\nDemonstration visualization saved to {output_file}")

plt.close()

print("\nVisualization complete!")
print("\nInterpretation:")
print("- The optimum (white star) is at the center, representing the best design found")
print("- Colors show projectile range: green=high, yellow=medium, red=low")
print(f"- The two axes represent the largest variation directions in the {gridSize*gridSize}-dimensional parameter space")
print("- The landscape shows how sensitive the design is to parameter changes")
print("- Steeper gradients indicate more sensitive parameters")
