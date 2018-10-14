import os
import json
import redis
from purly.model.server import Server
from purly.model.utils import merged_difference


class RedisPurlyServer(Server):

    def _init_server(self, server):
        host = os.environ["REDIS_HOST"]
        port = os.environ["REDIS_PORT"]
        self._redis = redis.Redis(host=host, port=port, db=0)
        self._connections = Connections(self._redis)
        self._messages = Messages(self._redis)
        self._models = Models(self._redis)

    def _init_connection(self, conn, model):
        self._connections.add(model, conn)
        # send off the current state of the model as first message
        init = {'header': {'type': 'update'}, 'content': self._models.state(model)}
        self._messages.add(init)

    def _sync(self, conn):
        messages = self._messages.all(conn)
        self._messages.clear(conn)
        return messages

    def _to_sync(self, conn, model, messages):
        for c in self._connections.all(model).difference({conn}):
            self._messages.add(c, *messages)

    def _load_update(self, model, update):
        return self._models.load(model, update)

    def _clean(self, model, conn):
        self._messages.clear(conn)
        self._connections.remove(model, conn)
        if not self._connections.active(model):
            self._connections.delete(model)


class Connections:

    def __init__(self, redis):
        self._redis = redis

    def _key(self, model):
        return "model-%s-connections" % model

    def add(self, model, conn):
        self._redis.sadd(self._key(model), conn)

    def remove(self, model, conn):
        self._redis.srem(self._key(model), conn)

    def all(self, model):
        key = self._key(model)
        if self._redis.exists(key):
            connections = self._redis.smembers(key)
            return {c.decode("utf-8") for c in connections}
        else:
            return set()

    def active(self, model):
        return bool(len(self.all(model)))

    def delete(self, model):
        self._redis.delete(self._key(model))


class Messages:

    def __init__(self, redis):
        self._redis = redis

    def _key(self, conn):
        return "connection-%s-messages" % conn

    def add(self, conn, *messages):
        for m in messages:
            self._redis.rpush(self._key(conn), json.dumps(m))

    def all(self, conn):
        key = self._key(conn)
        if self._redis.exists(key):
            return list(map(json.loads, self._redis.lrange(key, 0, -1)))
        else:
            return []

    def clear(self, conn):
        self._redis.delete(self._key(conn))


class Models:

    def __init__(self, redis):
        self._redis = redis

    def _key(self, model):
        return "model-%s-state" % model

    def state(self, model):
        key = self._key(model)
        if self._redis.exists(key):
            return {
                k.decode("utf-8"): json.loads(v)
                for k, v in
                self._redis.hgetall(key).items()
            }
        else:
            return {}

    def load(self, model, update):
        loaded = {}
        redis_key = self._key(model)
        for k, v in update.items():
            if v is None:
                self._redis.hdel(redis_key, k)
                to_load = v
            elif self._redis.hexists(redis_key, k):
                old = json.loads(self._redis.hget(redis_key, k))
                new, diff = merged_difference(old, v, {})
                if diff:
                    new = json.dumps(new)
                    self._redis.hset(redis_key, k, new)
                to_load = diff
            else:
                to_load = json.dumps(v)
                self._redis.hset(redis_key, k, to_load)
            loaded[k] = to_load
        return loaded


if __name__ == "__main__":
    Server(refresh=60, cors=True).run(host="0.0.0.0", port=8000)
