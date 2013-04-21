#
# fmqlEP wsgi v0.82
#
# This class stitches together brokerRPC and an FMQLQueryProcessor to make 
# an FMQL Endpoint that runs in Apache.
#
# TBD:
# - try loading python path in script load (WSGIImportScript) as can't load
#   with PYTHONPATH in Virtual Hosts.
# - take number of threads from os environ (or fallback to setting from host file)
# - stress number threads/processes etc.
#
# LICENSE:
# This program is free software; you can redistribute it and/or modify it under the terms of 
# the GNU Affero General Public License version 3 (AGPL) as published by the Free Software 
# Foundation.
# (c) 2010-2011 caregraf.org
#

import os, sys, urlparse, re, json
# Must add FMQL to Python path. Can't set Python Path in Virtual Host.
# IMPORTANT for Windows: remove the above and replace it with the Window's equivalent 'C:\<path to fmql>'
#sys.path.append('/usr/local/fmql')
#THEODORE
sys.path.append('C:\FMQL')
from brokerRPC import RPCConnectionPool
from fmqlQP import FMQLQueryProcessor
from fmqlQPE import FMQLQPE

class FMQLEP:

    def __init__(self):
        self.qpe = None
        self.fmqlEnviron = None

    def setFMQLEnviron(self, fmqlEnviron):
        # for simple server
        self.fmqlEnviron = fmqlEnviron

    def __call__(self, environ, start_response):
        try:
            if not self.qpe: # TBD make thread safe
                if not self.fmqlEnviron: # for Apache, not simple server - THEODORE
                    self.fmqlEnviron["rpcbroker"] = "www.examplehospital.com"
                    self.fmqlEnviron["rpcport"] = 9200
                    self.fmqlEnviron["rpcaccess"] = "QLFM1234"
                    self.fmqlEnviron["rpcverify"] = "QLFM1234!!"
                self.__initQueryProcessor(environ)
            queryArgs = urlparse.parse_qs(environ['QUERY_STRING'])
            reply = self.qpe.processQuery(queryArgs)
        # Exceptions: setting up comms to VistA or even QP code error
        except Exception as e:
            print >> sys.stderr, "FMQLEP: %s" % e # internal errors
            status = '200 Error Handled'
            reply = {"data": "Exception: %s" % e, "format": "json"}
        else:
            status = '200 OK'
        response_headers = [('Content-type', 'application/json'),
                            ('Content-Length', str(len(reply)))]
        start_response(status, response_headers)
        return [reply]

    def __initQueryProcessor(self, environ):
        # 25 if multi-threaded (ala winnt mpm or worker mpm), 1 otherwise (prefork unix, the Apache unix default). Nice if could
        # get actual number of threads in a process.
        noThreads = 25 if environ["wsgi.multithread"] == True else 1
#THEODRE
#        rpcc = RPCConnectionPool(self.fmqlEnviron["rpcbroker"], noThreads, self.fmqlEnviron["rpchost"], int(self.fmqlEnviron["rpcport"]), self.fmqlEnviron["rpcaccess"], self.fmqlEnviron["rpcverify"], "CG FMQL QP USER", WSGILogger("BrokerRPC"))
        rpcc = RPCConnectionPool("www.examplehospital.com", noThreads, "www.examplehospital.com", 9200, "QLFM1234", "QLFM1234!!", "CG FMQL QP USER", WSGILogger("BrokerRPC"))
        logger = WSGILogger("FMQLQP")
        qp = FMQLQueryProcessor(rpcc, logger)
        self.qpe = FMQLQPE(qp, logger)

class WSGILogger:
    def __init__(self, generator):
        self.generator = generator

    def logError(self, tag, msg):
        logmsg = "%s (%s): %s -- %s" % (self.generator, os.getpid(), tag, msg)
        # TBD: consider passing in environ["wsgi.errors"] problem with expiration
        print >> sys.stderr, logmsg

    def logInfo(self, tag, msg):
        # self.logError(tag, msg)
        pass

