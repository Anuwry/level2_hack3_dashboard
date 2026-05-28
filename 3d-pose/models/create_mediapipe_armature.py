"""
Blender Python script — creates a MediaPipe 17-joint armature
with bone names matching the BadmintonIQ pose pipeline.

Usage:
  1. Open Blender
  2. Go to Scripting workspace
  3. Paste this script and press Run Script
  4. An armature named "MediaPipe_Rig" will be created in the scene

Bone naming convention matches keypoints_17 keys:
  Hips, Spine1, Spine2, Neck, Head,
  LeftArm, LeftForeArm, LeftHand,
  RightArm, RightForeArm, RightHand,
  LeftUpLeg, LeftLeg, LeftFoot,
  RightUpLeg, RightLeg, RightFoot

Coordinate system: Blender (Y=forward, Z=up)
The rig is in a rough T-pose at 1.75 m scale.
After linking your mesh, use the bone names above in vertex groups
or as custom bone name mappings in your retargeting setup.
"""

import bpy
import mathutils

# Remove existing MediaPipe_Rig if present
if "MediaPipe_Rig" in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects["MediaPipe_Rig"], do_unlink=True)

# ── T-pose joint world positions (Z=up, Y=forward) ────────────────────────
# Scale: ~1.75 m tall human, Hips at origin
POSITIONS = {
    # Spine
    "Hips":        (0.00,  0.00,  0.00),
    "Spine1":      (0.00,  0.00,  0.15),
    "Spine2":      (0.00,  0.00,  0.30),
    "Neck":        (0.00,  0.00,  0.50),
    "Head":        (0.00,  0.00,  0.65),

    # Left arm  (Blender: +X = right of character, so left arm = +X side)
    "LeftArm":     ( 0.20,  0.00,  0.48),
    "LeftForeArm": ( 0.45,  0.00,  0.48),
    "LeftHand":    ( 0.68,  0.00,  0.48),

    # Right arm
    "RightArm":    (-0.20,  0.00,  0.48),
    "RightForeArm":(-0.45,  0.00,  0.48),
    "RightHand":   (-0.68,  0.00,  0.48),

    # Left leg  (+X side)
    "LeftUpLeg":   ( 0.10,  0.00,  0.00),
    "LeftLeg":     ( 0.10,  0.00, -0.45),
    "LeftFoot":    ( 0.10,  0.06, -0.88),

    # Right leg
    "RightUpLeg":  (-0.10,  0.00,  0.00),
    "RightLeg":    (-0.10,  0.00, -0.45),
    "RightFoot":   (-0.10,  0.06, -0.88),
}

# parent → [children]  (defines bone tail = child head, or offset for leaf)
PARENT = {
    "Spine1":      "Hips",
    "Spine2":      "Spine1",
    "Neck":        "Spine2",
    "Head":        "Neck",
    "LeftArm":     "Neck",
    "LeftForeArm": "LeftArm",
    "LeftHand":    "LeftForeArm",
    "RightArm":    "Neck",
    "RightForeArm":"RightArm",
    "RightHand":   "RightForeArm",
    "LeftUpLeg":   "Hips",
    "LeftLeg":     "LeftUpLeg",
    "LeftFoot":    "LeftLeg",
    "RightUpLeg":  "Hips",
    "RightLeg":    "RightUpLeg",
    "RightFoot":   "RightLeg",
}

# Leaf bone tail offsets (bones with no children need an explicit tail)
LEAF_TAIL_OFFSET = {
    "Head":      (0.00,  0.00,  0.14),
    "LeftHand":  ( 0.12,  0.00,  0.00),
    "RightHand": (-0.12,  0.00,  0.00),
    "LeftFoot":  ( 0.00,  0.14,  0.00),
    "RightFoot": ( 0.00,  0.14,  0.00),
}

# ── Create armature ────────────────────────────────────────────────────────
arm_data = bpy.data.armatures.new("MediaPipe_Rig")
arm_obj  = bpy.data.objects.new("MediaPipe_Rig", arm_data)
bpy.context.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
arm_obj.select_set(True)

bpy.ops.object.mode_set(mode='EDIT')
edit_bones = arm_data.edit_bones

created = {}

# Order: parents before children
ORDER = [
    "Hips", "Spine1", "Spine2", "Neck", "Head",
    "LeftArm", "LeftForeArm", "LeftHand",
    "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot",
]

for name in ORDER:
    b = edit_bones.new(name)
    head = mathutils.Vector(POSITIONS[name])
    b.head = head

    # Tail = child joint head (if any) else head + offset
    children = [c for c, p in PARENT.items() if p == name]
    if children:
        # Use first child as tail direction
        b.tail = mathutils.Vector(POSITIONS[children[0]])
    elif name in LEAF_TAIL_OFFSET:
        off = mathutils.Vector(LEAF_TAIL_OFFSET[name])
        b.tail = head + off
    else:
        b.tail = head + mathutils.Vector((0, 0, 0.1))

    created[name] = b

# Set parent relationships
for name in ORDER:
    if name in PARENT:
        created[name].parent = created[PARENT[name]]
        created[name].use_connect = True

bpy.ops.object.mode_set(mode='OBJECT')

print("MediaPipe_Rig created with bones:", list(POSITIONS.keys()))
print("Done — link your mesh vertex groups to these bone names.")
