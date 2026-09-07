import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

out_dir = r"C:\Users\deepa\OneDrive\Desktop\Project-Kavach-Swara\artifacts"
os.makedirs(out_dir, exist_ok=True)

# Chart 1: AI Adoption Growth in Global Education (2020-2030 Projections)
fig, ax = plt.subplots(figsize=(7, 3.5), dpi=200)
years = np.array([2020, 2022, 2024, 2026, 2028, 2030])
higher_ed = [18, 29, 44, 62, 78, 89]
k12 = [8, 15, 28, 48, 67, 82]
corporate = [24, 38, 56, 74, 88, 95]

ax.plot(years, higher_ed, marker='o', linewidth=2.2, color='#1F4E79', label='Higher Education Institutions (%)')
ax.plot(years, k12, marker='s', linewidth=2.2, color='#008080', label='K-12 School Systems (%)')
ax.plot(years, corporate, marker='^', linewidth=2.2, color='#D9534F', label='Enterprise & Workforce Training (%)')

ax.set_title('Global AI Integration Trajectory in Education (2020-2030)', fontsize=11, fontweight='bold', color='#16324F', pad=12)
ax.set_xlabel('Academic Year', fontsize=9, fontweight='bold')
ax.set_ylabel('Adoption & Curriculum Integration (%)', fontsize=9, fontweight='bold')
ax.set_ylim(0, 105)
ax.grid(True, linestyle='--', alpha=0.4)
ax.legend(frameon=True, facecolor='#F8F9FA', edgecolor='#D0D7E0', fontsize=8.5, loc='upper left')
plt.tight_layout()
chart1_path = os.path.join(out_dir, "ai_ed_adoption_trajectory.png")
plt.savefig(chart1_path, dpi=200)
plt.close()
print(f"Saved Chart 1: {chart1_path}")

# Chart 2: Efficacy Gains with Adaptive AI Tutoring vs Traditional Pedagogy
fig, ax = plt.subplots(figsize=(7, 3.5), dpi=200)
disciplines = ['Mathematics & STEM', 'Language Acquisition', 'Coding & Computer Science', 'Reading Comprehension', 'Conceptual Retention']
traditional = [62, 58, 65, 70, 54]
ai_assisted = [88, 84, 91, 89, 81]

x = np.arange(len(disciplines))
width = 0.35

rects1 = ax.bar(x - width/2, traditional, width, label='Traditional Classroom Baseline', color='#8B9DAF')
rects2 = ax.bar(x + width/2, ai_assisted, width, label='AI-Adaptive Personalized Learning', color='#1F4E79')

ax.set_title('Learning Mastery & Retention Rates: AI-Adaptive vs. Baseline', fontsize=11, fontweight='bold', color='#16324F', pad=12)
ax.set_ylabel('Mastery Score (%)', fontsize=9, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels([d.replace(' & ', ' &\n') for d in disciplines], fontsize=8, fontweight='bold')
ax.set_ylim(0, 105)
ax.grid(axis='y', linestyle='--', alpha=0.4)
ax.legend(frameon=True, facecolor='#F8F9FA', edgecolor='#D0D7E0', fontsize=8.5, loc='upper left')

for bar in rects1:
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2.0, yval + 1.5, f'{yval}%', ha='center', va='bottom', fontsize=7.5, color='#4A5568')

for bar in rects2:
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2.0, yval + 1.5, f'{yval}%', ha='center', va='bottom', fontsize=7.5, fontweight='bold', color='#1F4E79')

plt.tight_layout()
chart2_path = os.path.join(out_dir, "ai_ed_mastery_comparison.png")
plt.savefig(chart2_path, dpi=200)
plt.close()
print(f"Saved Chart 2: {chart2_path}")
