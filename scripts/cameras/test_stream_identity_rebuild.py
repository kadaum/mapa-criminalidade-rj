import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
ASSEMBLER = ROOT / "scripts/cameras/assemble-catalog.py"
REFRESH = ROOT / "scripts/cameras/refresh-curated-stream-identities.mjs"
IDENTITY_MODULE = ROOT / "scripts/cameras/stream_identities.py"
IDENTITY_SPEC = importlib.util.spec_from_file_location("stream_identities", IDENTITY_MODULE)
identity_module = importlib.util.module_from_spec(IDENTITY_SPEC)
sys.modules[IDENTITY_SPEC.name] = identity_module
IDENTITY_SPEC.loader.exec_module(identity_module)


def home(camera_id, source, **extra):
    return {
        "id": camera_id,
        "name": camera_id,
        "neighborhood": "Copacabana",
        "operator": "Homes in Rio",
        "publisher": "Homes in Rio",
        "address": "Reference address",
        "coordinates": [-43.1, -22.9],
        "precision": "spot",
        "locationSource": source,
        "source": "https://www.youtube.com/watch?v=oldid123456",
        "youtubeId": "oldid123456",
        "watchUrl": "https://www.youtube.com/watch?v=oldid123456",
        "access": "public",
        "status": "observed",
        **extra,
    }


class StreamIdentityRebuildTests(unittest.TestCase):
    def fixture(self, directory):
        research = directory / "research/cameras"
        research.mkdir(parents=True)
        (directory / "public").mkdir()
        (research / "reviewed-additions.json").write_text("[]")
        (research / "reviewed-updates.json").write_text(json.dumps([
            {"id": "homes-posto-3", "youtubeId": "k2QzfrPLQSg", "source": "https://www.youtube.com/watch?v=k2QzfrPLQSg"},
            {"id": "homes-posto-6", "youtubeId": "Hr7c0XuEgm0", "watchUrl": "https://www.youtube.com/watch?v=Hr7c0XuEgm0"},
        ]))
        (research / "playback-audit-updates.json").write_text(json.dumps([
            {"id": "homes-posto-3", "status": "observed", "youtubeId": "k2QzfrPLQSg",
             "playbackCheck": {"checkedAt": "2026-09-26T13:21:22.354Z", "outcome": "playing", "reason": "historic", "method": "fixture"}},
            {"id": "homes-posto-6", "status": "failed", "youtubeId": "Hr7c0XuEgm0",
             "playbackCheck": {"checkedAt": "2026-10-06T13:21:22.354Z", "outcome": "failed", "reason": "current failure fixture", "method": "fixture"}},
            {"id": "other-camera", "status": "observed", "youtubeId": "OtherID1234",
             "playbackCheck": {"checkedAt": "2026-10-06T13:21:22.354Z", "outcome": "playing", "reason": "kept", "method": "fixture"}},
        ]))
        inputs = {
            "geo.json": {"cameras": [], "catalogUrl": "https://example.test/catalog"},
            "web.json": {"cameras": []},
            "seed.json": [
                home("homes-posto-3", "legacy locator"),
                home("homes-posto-6", "legacy locator", precision="directory"),
                {"id": "other-camera", "name": "Other", "neighborhood": "Centro", "publisher": "Other",
                 "operator": "Unknown", "address": "Other place", "coordinates": None, "precision": "unresolved",
                 "locationSource": "", "source": "https://www.youtube.com/watch?v=OtherID1234", "youtubeId": "OtherID1234",
                 "access": "public", "status": "observed"},
            ],
        }
        for name, value in inputs.items():
            (directory / name).write_text(json.dumps(value))
        return directory

    def test_assembler_applies_final_identity_after_legacy_overlays(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            self.fixture(directory)
            result = subprocess.run([sys.executable, str(ASSEMBLER), "geo.json", "web.json", "seed.json"], cwd=directory, check=False, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            catalog = json.loads((directory / "public/data/public-cameras.json").read_text())
            cameras = {camera["id"]: camera for camera in catalog["cameras"]}
            for camera_id, source, historical_id in [
                ("homes-posto-3", "https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam", "k2QzfrPLQSg"),
                ("homes-posto-6", "https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam", "Hr7c0XuEgm0"),
            ]:
                camera = cameras[camera_id]
                self.assertEqual(camera["source"], source)
                self.assertEqual(camera["streamResolver"], camera_id)
                self.assertEqual(camera["historicalStreams"][0]["streamId"], historical_id)
                self.assertNotIn("youtubeId", camera)
                self.assertNotIn("watchUrl", camera)
                self.assertIn("playbackCheck", camera)
            self.assertEqual(cameras["homes-posto-3"]["playbackCheck"]["outcome"], "playing")
            self.assertEqual(cameras["homes-posto-6"]["playbackCheck"]["outcome"], "failed")
            self.assertEqual(cameras["homes-posto-6"]["precision"], "directory")
            self.assertEqual(cameras["other-camera"]["youtubeId"], "OtherID1234")
            self.assertEqual(cameras["other-camera"]["playbackCheck"]["outcome"], "playing")
            self.assertTrue((directory / "public/data/camera-location-evidence.json").exists())

    def test_missing_curated_camera_fails_closed(self):
        identities = identity_module.load_identities()
        with self.assertRaisesRegex(ValueError, "Missing curated resolver camera"):
            identity_module.apply_stream_identities([{"id": "other-camera"}], identities)

    def test_malformed_identity_rejected(self):
        document = json.loads((ROOT / "research/cameras/stream-identities.json").read_text())
        document["cameras"][0]["source"] = "https://example.org/stream"
        with self.assertRaisesRegex(ValueError, "Invalid fixed operator identity"):
            identity_module.validate_identities(document)

    def test_duplicate_identity_ids_rejected_by_python_and_js_cli(self):
        document = json.loads((ROOT / "research/cameras/stream-identities.json").read_text())
        document["cameras"].append(dict(document["cameras"][0]))
        with self.assertRaisesRegex(ValueError, "exactly the two Homes cameras"):
            identity_module.validate_identities(document)
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            identities_path = directory / "duplicate-identities.json"
            catalog_path = directory / "catalog.json"
            identities_path.write_text(json.dumps(document))
            catalog_path.write_text(json.dumps({"cameras": [home("homes-posto-3", "old"), home("homes-posto-6", "old")]}))
            result = subprocess.run(["node", str(REFRESH), str(catalog_path), str(identities_path)],
                                    cwd=ROOT, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Invalid curated stream identity", result.stderr)
            self.assertEqual(len(json.loads(catalog_path.read_text())["cameras"]), 2)

    def test_boolean_schema_version_rejected_by_python(self):
        document = json.loads((ROOT / "research/cameras/stream-identities.json").read_text())
        document["schemaVersion"] = True
        with self.assertRaisesRegex(ValueError, "Invalid curated stream identity document"):
            identity_module.validate_identities(document)

    def test_refresh_cli_is_fixture_path_safe_and_uses_shared_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "catalog.json"
            catalog = {"cameras": [home("homes-posto-3", "legacy"), home("homes-posto-6", "legacy"),
                                    {"id": "other-camera", "source": "keep", "youtubeId": "OtherID1234"}]}
            path.write_text(json.dumps(catalog))
            subprocess.run(["node", str(REFRESH), str(path)], cwd=ROOT, check=True, capture_output=True, text=True)
            result = json.loads(path.read_text())
            cameras = {camera["id"]: camera for camera in result["cameras"]}
            self.assertEqual(cameras["homes-posto-3"]["source"], "https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam")
            self.assertNotIn("youtubeId", cameras["homes-posto-3"])
            self.assertEqual(cameras["other-camera"]["youtubeId"], "OtherID1234")


if __name__ == "__main__":
    unittest.main()
