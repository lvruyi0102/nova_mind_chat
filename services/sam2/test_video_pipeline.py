from pathlib import Path

import numpy as np
import pytest

from video_pipeline import VideoCancelled, VideoLimitError, decode_video_frames, track_video_with_sam2


class FakeTensor:
    def __init__(self, value):
        self.value = np.asarray(value)

    def __getitem__(self, index):
        return FakeTensor(self.value[index])

    def detach(self):
        return self

    def float(self):
        return self

    def cpu(self):
        return self

    def numpy(self):
        return self.value


class FakePredictor:
    def __init__(self):
        self.reset_called = False
        self.received = None

    def init_state(self, **kwargs):
        self.video_path = kwargs["video_path"]
        return {"isolated": True}

    def add_new_points_or_box(self, **kwargs):
        self.received = kwargs

    def propagate_in_video(self, state, **kwargs):
        yield 0, [1], FakeTensor(np.ones((1, 1, 4, 5), dtype=np.float32))
        yield 1, [1], FakeTensor(np.zeros((1, 1, 4, 5), dtype=np.float32))

    def reset_state(self, state):
        self.reset_called = True


def test_video_tracking_writes_masks_and_resets_state(tmp_path):
    frames = tmp_path / "frames"
    frames.mkdir()
    predictor = FakePredictor()
    results = track_video_with_sam2(
        predictor, frames, 100, 80,
        [{"x": 0.5, "y": 0.25, "label": 1}],
        (0.1, 0.2, 0.8, 0.9),
        tmp_path / "artifacts",
    )
    assert [item["frameIndex"] for item in results] == [0, 1]
    assert all(Path(item["maskPath"]).is_file() for item in results)
    assert predictor.reset_called
    assert predictor.received["points"].tolist() == [[50.0, 20.0]]
    assert predictor.received["box"].tolist() == [10.0, 16.0, 80.0, 72.0]
    assert predictor.received["normalize_coords"] is True


def test_video_tracking_rejects_missing_prompt(tmp_path):
    with pytest.raises(ValueError, match="prompt"):
        track_video_with_sam2(FakePredictor(), tmp_path, 100, 80, None, None, tmp_path / "artifacts")


def test_decode_rejects_missing_video(tmp_path):
    with pytest.raises(VideoLimitError, match="does not exist"):
        decode_video_frames(tmp_path / "missing.mp4", tmp_path / "frames")


def test_video_tracking_supports_cooperative_cancellation(tmp_path):
    class CancellingPredictor(FakePredictor):
        def propagate_in_video(self, state, **kwargs):
            yield 0, [1], FakeTensor(np.ones((1, 1, 4, 5), dtype=np.float32))

    predictor = CancellingPredictor()
    with pytest.raises(VideoCancelled, match="cancelled"):
        track_video_with_sam2(
            predictor, tmp_path / "frames", 100, 80,
            [{"x": 0.5, "y": 0.5, "label": 1}], None,
            tmp_path / "artifacts", cancel_check=lambda: True,
        )
    assert predictor.reset_called
