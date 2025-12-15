#!/usr/bin/env python3
"""
Generate a high-quality 2D landscape plot of the objective function
around the optimum along the two principal covariance directions.
"""

import json
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
import sys

def plot_landscape(data_file='landscape-data.json'):
    """Load landscape data and create visualization."""

    # Load data
    try:
        with open(data_file, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {data_file} not found. Please run the optimizer first.")
        sys.exit(1)

    # Extract data
    eigenvalues = data['eigenvalues']
    t1_grid = np.array(data['t1_grid'])
    t2_grid = np.array(data['t2_grid'])
    objective_values = np.array(data['objectiveValues'])
    scale1 = data['scale1']
    scale2 = data['scale2']
    min_obj = data['minObj']
    max_obj = data['maxObj']

    print(f"Loaded {len(objective_values)} data points")
    print(f"Eigenvalue 1: {eigenvalues[0]:.2f}, Eigenvalue 2: {eigenvalues[1]:.2f}")
    print(f"Scale 1: {scale1:.2f}, Scale 2: {scale2:.2f}")
    print(f"Objective range: {min_obj:.1f} - {max_obj:.1f} ft")

    # Reshape data into grid
    grid_size = int(np.sqrt(len(objective_values)))
    X = (t1_grid * scale1).reshape(grid_size, grid_size)
    Y = (t2_grid * scale2).reshape(grid_size, grid_size)
    Z = objective_values.reshape(grid_size, grid_size)

    # Create figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

    # Plot 1: Filled contour plot
    levels = 20
    contourf = ax1.contourf(X, Y, Z, levels=levels, cmap='RdYlGn')
    contour = ax1.contour(X, Y, Z, levels=levels, colors='black', alpha=0.3, linewidths=0.5)
    ax1.clabel(contour, inline=True, fontsize=8, fmt='%.0f')

    # Mark the optimum at (0, 0)
    ax1.plot(0, 0, 'w*', markersize=20, markeredgecolor='black', markeredgewidth=2, label='Optimum')

    ax1.set_xlabel(f'Principal Direction 1 (λ₁ = {eigenvalues[0]:.2f})', fontsize=12)
    ax1.set_ylabel(f'Principal Direction 2 (λ₂ = {eigenvalues[1]:.2f})', fontsize=12)
    ax1.set_title('Objective Function Landscape (Range in feet)\nContour Plot', fontsize=14, fontweight='bold')
    ax1.grid(True, alpha=0.3)
    ax1.legend(loc='upper right')

    cbar1 = plt.colorbar(contourf, ax=ax1)
    cbar1.set_label('Range (ft)', fontsize=12)

    # Plot 2: 3D surface plot (as 2D heatmap with better color coding)
    im = ax2.imshow(Z, extent=[X.min(), X.max(), Y.min(), Y.max()],
                    origin='lower', cmap='RdYlGn', aspect='auto', interpolation='bilinear')

    # Mark the optimum
    ax2.plot(0, 0, 'w*', markersize=20, markeredgecolor='black', markeredgewidth=2, label='Optimum')

    ax2.set_xlabel(f'Principal Direction 1 (λ₁ = {eigenvalues[0]:.2f})', fontsize=12)
    ax2.set_ylabel(f'Principal Direction 2 (λ₂ = {eigenvalues[1]:.2f})', fontsize=12)
    ax2.set_title('Objective Function Landscape (Range in feet)\nHeatmap', fontsize=14, fontweight='bold')
    ax2.grid(True, alpha=0.3, color='white', linewidth=0.5)
    ax2.legend(loc='upper right')

    cbar2 = plt.colorbar(im, ax=ax2)
    cbar2.set_label('Range (ft)', fontsize=12)

    plt.suptitle(f'Whipper Design Optimization Landscape\nObjective Range: {min_obj:.1f} - {max_obj:.1f} ft | 3× Covariance Scale',
                 fontsize=16, fontweight='bold', y=1.02)

    plt.tight_layout()

    # Save figure
    output_file = 'landscape_visualization.png'
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    print(f"\nVisualization saved to {output_file}")

    # Also create a 3D surface plot
    fig3d = plt.figure(figsize=(12, 9))
    ax3d = fig3d.add_subplot(111, projection='3d')

    surf = ax3d.plot_surface(X, Y, Z, cmap='RdYlGn', linewidth=0, antialiased=True, alpha=0.9)

    # Mark the optimum
    ax3d.scatter([0], [0], [Z[grid_size//2, grid_size//2]], color='red', s=200, marker='*',
                 edgecolors='black', linewidths=2, label='Optimum', zorder=10)

    ax3d.set_xlabel(f'Principal Direction 1\n(λ₁ = {eigenvalues[0]:.2f})', fontsize=11)
    ax3d.set_ylabel(f'Principal Direction 2\n(λ₂ = {eigenvalues[1]:.2f})', fontsize=11)
    ax3d.set_zlabel('Range (ft)', fontsize=11)
    ax3d.set_title('Whipper Design Optimization - 3D Landscape\n3× Covariance Scale',
                   fontsize=14, fontweight='bold', pad=20)

    # Add colorbar
    fig3d.colorbar(surf, ax=ax3d, shrink=0.5, aspect=5, label='Range (ft)')

    # Set viewing angle
    ax3d.view_init(elev=25, azim=45)
    ax3d.legend(loc='upper left')

    output_file_3d = 'landscape_visualization_3d.png'
    plt.savefig(output_file_3d, dpi=300, bbox_inches='tight')
    print(f"3D visualization saved to {output_file_3d}")

    plt.show()

if __name__ == '__main__':
    plot_landscape()
