import cv2
import numpy as np

try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
except AttributeError:
    from mediapipe.python.solutions import pose as mp_pose

# MediaPipe landmark index → skeleton joint name (12 key joints)
MEDIAPIPE_INDICES = {
    "LeftArm": 11,
    "RightArm": 12,
    "LeftForeArm": 13,
    "RightForeArm": 14,
    "LeftHand": 15,
    "RightHand": 16,
    "LeftUpLeg": 23,
    "RightUpLeg": 24,
    "LeftLeg": 25,
    "RightLeg": 26,
    "LeftFoot": 27,
    "RightFoot": 28,
}

JOINT_NAMES = [
    "Hips", "Spine1", "Spine2", "Neck", "Head",
    "LeftArm", "LeftForeArm", "LeftHand",
    "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot",
    "RightUpLeg", "RightLeg", "RightFoot",
]


class KeypointKalmanFilter:
    def __init__(self, n: int = 17):
        self.filters = []
        self.inited = [False] * n
        for _ in range(n):
            kf = cv2.KalmanFilter(6, 3)
            kf.transitionMatrix = np.eye(6, dtype=np.float32)
            for i in range(3):
                kf.transitionMatrix[i, i + 3] = 0.2
            kf.measurementMatrix = np.zeros((3, 6), dtype=np.float32)
            for i in range(3):
                kf.measurementMatrix[i, i] = 1.0
            kf.processNoiseCov = np.eye(6, dtype=np.float32) * 1e-4
            kf.measurementNoiseCov = np.eye(3, dtype=np.float32) * 1e-2
            kf.statePost = np.zeros((6, 1), dtype=np.float32)
            self.filters.append(kf)

    def update(self, kps: list) -> list:
        out = []
        for i, kp in enumerate(kps):
            if kp is None:
                out.append(None)
                continue
            m = np.array(kp[:3], dtype=np.float32).reshape(3, 1)
            if not self.inited[i]:
                self.filters[i].statePost[:3] = m
                self.inited[i] = True
            self.filters[i].predict()
            s = self.filters[i].correct(m)
            out.append([float(s[0]), float(s[1]), float(s[2])])
        return out


class PoseExtractor:
    def __init__(self, use_kalman: bool = True, model_complexity: int = 1,
                 min_detection_confidence: float = 0.5):
        self.pose = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=model_complexity,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_detection_confidence,
        )
        self.kalman = KeypointKalmanFilter(17) if use_kalman else None

    def process_frame(self, frame: np.ndarray) -> tuple:
        """
        Returns (keypoints_dict, image_keypoints, pose_detected, visibility_mean).
        keypoints_dict   — joint name → [x, y, z] MediaPipe world coords (for 3D animation)
        image_keypoints  — joint name → [x, y] normalized image coords 0-1 (for 2D overlay)
        """
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        if not results.pose_world_landmarks or not results.pose_landmarks:
            return {}, {}, False, 0.0

        lms_world = results.pose_world_landmarks.landmark
        lms_img   = results.pose_landmarks.landmark

        joints_12: dict = {}
        img_joints: dict = {}
        vis_scores = []

        for name, idx in MEDIAPIPE_INDICES.items():
            lm = lms_world[idx]
            joints_12[name] = [lm.x, lm.y, lm.z]
            li = lms_img[idx]
            img_joints[name] = [round(li.x, 4), round(li.y, 4)]
            vis_scores.append(lm.visibility)

        # Add computed midpoint joints so the frontend can draw a full spine
        lh, rh = img_joints["LeftUpLeg"],  img_joints["RightUpLeg"]
        ls, rs = img_joints["LeftArm"],    img_joints["RightArm"]
        img_joints["Hips"] = [round((lh[0]+rh[0])/2, 4), round((lh[1]+rh[1])/2, 4)]
        img_joints["Neck"] = [round((ls[0]+rs[0])/2, 4), round((ls[1]+rs[1])/2, 4)]

        vis_mean = float(np.mean(vis_scores))
        kp_list  = self._map_17(joints_12)

        if self.kalman:
            kp_list = self.kalman.update(kp_list)

        kp_dict = {JOINT_NAMES[i]: kp_list[i] for i in range(17) if kp_list[i] is not None}
        return kp_dict, img_joints, True, vis_mean

    def _map_17(self, j: dict) -> list:
        def lerp(a, b, t):
            return [a[k] * (1 - t) + b[k] * t for k in range(3)]

        lh, rh = j["LeftUpLeg"], j["RightUpLeg"]
        ls, rs = j["LeftArm"], j["RightArm"]

        hips   = lerp(lh, rh, 0.5)
        neck   = lerp(ls, rs, 0.5)
        spine1 = lerp(hips, neck, 0.33)
        spine2 = lerp(hips, neck, 0.66)
        # Head: one neck-to-spine2 step above neck
        head   = [neck[k] + (neck[k] - spine2[k]) for k in range(3)]

        return [
            hips,  spine1, spine2, neck,  head,
            j["LeftArm"], j["LeftForeArm"], j["LeftHand"],
            j["RightArm"], j["RightForeArm"], j["RightHand"],
            j["LeftUpLeg"], j["LeftLeg"], j["LeftFoot"],
            j["RightUpLeg"], j["RightLeg"], j["RightFoot"],
        ]

    def close(self):
        self.pose.close()
