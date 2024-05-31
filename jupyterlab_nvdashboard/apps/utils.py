from tornado.websocket import WebSocketHandler
from jupyter_server.base.handlers import JupyterHandler
import tornado
import json


class CustomWebSocketHandler(JupyterHandler, WebSocketHandler):
    def open(self):
        if not self.current_user:
            self.write_message(json.dumps({"error": "Unauthorized access"}))
            self.close()
            return
        self.write_message(json.dumps({"status": "connected"}))
        self.set_nodelay(True)
        # Start a periodic callback to send data every 50ms
        self.callback = tornado.ioloop.PeriodicCallback(self.send_data, 1000)
        self.callback.start()

    def on_message(self, message):
        message_data = json.loads(message)
        # Update the periodic callback frequency
        new_frequency = message_data["updateFrequency"]
        if hasattr(self, "callback"):
            self.callback.stop()
            self.callback = tornado.ioloop.PeriodicCallback(
                self.send_data, new_frequency
            )
            if not message_data["isPaused"]:
                self.callback.start()

    def on_close(self):
        if hasattr(self, "callback") and self.callback.is_running():
            self.callback.stop()

    def send_data(self):
        pass
