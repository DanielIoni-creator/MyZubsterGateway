[0;1;32m●[0m mongod.service - MongoDB Database Server
     Loaded: loaded (]8;;file://myzubster/usr/lib/systemd/system/mongod.service/usr/lib/systemd/system/mongod.service]8;;; [0;1;32menabled[0m; preset: [0;1;32menabled[0m)
     Active: [0;1;32mactive (running)[0m since Sun 2026-08-02 19:23:28 CEST; 1 day 12h ago
       Docs: ]8;;https://docs.mongodb.org/manualhttps://docs.mongodb.org/manual]8;;
   Main PID: 788 (mongod)
     Memory: 120.4M (peak: 349.2M swap: 29.7M swap peak: 29.7M)
        CPU: 17min 58.730s
     CGroup: /system.slice/mongod.service
             └─[0;38;5;245m788 /usr/bin/mongod --config /etc/mongod.conf[0m

Aug 02 19:23:28 myzubster systemd[1]: Started mongod.service - MongoDB Database Server.
Aug 02 19:23:30 myzubster mongod[788]: {"t":{"$date":"2026-08-02T17:23:30.466Z"},"s":"I",  "c":"CONTROL",  "id":7484500, "ctx":"main","msg":"Environment variable MONGODB_CONFIG_OVERRIDE_NOFORK == 1, overriding \"processManagement.fork\" to false"}
