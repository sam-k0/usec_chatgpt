import matplotlib.pyplot as plt
import numpy as np

classes = [
    {"label": "18-29", "count": 63, "color": "#d65f91"}, 
    {"label": "30-39", "count": 54, "color": "#2a8ac2"},    
    {"label": "40-49", "count": 55, "color": "#387c38"},
    {"label": "50-59", "count": 53, "color": "#972684"},
    {"label": "60+", "count": 71, "color": "#ffe600"},
]

classes = [
    {"label": "Female", "count": 143, "color": "#d65f91"}, 
    {"label": "Male", "count": 151, "color": "#2a8ac2"},    
    {"label": "Other", "count": 1, "color": "#387c38"},
]

classes = [
    {"label": "Yes", "count": 58, "color": "#ff0000"}, 
    {"label": "No", "count": 236, "color": "#2a8ac2"},    
]

classes = [
    {"label": "Yes", "count": 47, "color": "#ff0000"}, 
    {"label": "No", "count": 247, "color": "#2a8ac2"},    
]


title = "Security Background"
fname = title
per_column = 15
spacing = (1.0, 0.5)  # (horizontal, vertical)

# Ensure total point count = target_n_points
n_points = sum(group["count"] for group in classes)
target_n_points = 300
if n_points < target_n_points:
    remaining_count = target_n_points - n_points
    classes.append({"label": "Unknown", "count": remaining_count, "color": "#818181"})
    n_points += remaining_count

# Prepare colors and labels
labels = []
colors = []
for group in classes:
    labels.extend([group["label"]] * group["count"])
    colors.extend([group["color"]] * group["count"])

# Grid layout
n_cols = int(np.ceil(n_points / per_column))
x_positions = np.repeat(np.arange(n_cols), per_column)[:n_points]
y_positions = np.tile(np.arange(per_column), n_cols)[:n_points]

# Figure setup
plt.figure(figsize=(6, 5))
ax = plt.gca()
ax.set_facecolor("lightgray")

# Scatter points
plt.scatter(
    x_positions * spacing[0],
    y_positions * spacing[1],
    s=90,
    color=colors,
    edgecolors="white",
    linewidths=0.5,
)

# Legend with percentages
for group in classes:
    percentage = 100 * group["count"] / n_points
    plt.scatter([], [], color=group["color"],
                label=f"{group['label']} ({group['count']}, {percentage:.1f}%)")

plt.axis("equal")
plt.axis("off")

# Legend outside
plt.legend(title="Groups", loc="center left", bbox_to_anchor=(1, 0.5))

# Title — closer to plot
plt.title(f"Participant Distribution: {title}", fontsize=14, pad=5)

# Compact layout
plt.tight_layout(pad=0.2)
plt.subplots_adjust(top=0.4)  # reduces title gap

# Save
plt.savefig(f"{fname}.png", dpi=300, bbox_inches="tight", pad_inches=0)
plt.close()
