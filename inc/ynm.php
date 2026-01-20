<!DOCTYPE html>  
   <title>Bot Dashboard - Teljes statisztika</title><br>
 
   

    <button  id="refreshBtn" class="btn">🔄 Frissítés</button>
<span class="stat-value" id="botNetworkTraffic" hidden>-</span>          
<span class="stat-value" id="botValue" hidden>-</span>          


<div class="row">
    <!-- BAL OLDAL: 2 kártya EGYMÁS ALATT -->
    <div class="col-12 col-md-8 col-lg-8 col-xl-8">
        <!-- 1. kártya: CSATORNA LISTA -->
        <div class="mb-3">
            <div class="card border-info h-350">
                <div class="card-body p-3">
                    <div class="card border-info shadow text-info p-2 my-card text-center mb-3">#️⃣</div>
                    <div class="stat-row">

                        <span class="stat-value" id="botChannelsList">-</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 2. kártya: USERS LISTÁK -->
        <div class="mb-3">
            <div class="stats-card card border-info h-350">
                <div class="card-body p-3">
                    <div class="card border-info shadow text-info p-2 my-card text-center mb-3">👥</div>
					                    <div class="stat-row">
                        <span class="text-primary fw-bold">Global Admins:</span>
                        <span class="json-value " id="botGlobalAdmins">-</span>
                    </div>
                    <div class="stat-row">
                        <span class="text-success fw-bold">Global Mods:</span>
                        <span class="json-value" id="botGlobalMods">-</span>
                    </div>
                    <div class="stat-row">
                        <span class="text-info fw-bold">Global VIPs:</span>
                        <span class="json-value" id="botGlobalVips">-</span>
                    </div>
                    <div class="stat-row">
                        <span class="text-primary fst-italic">Admins:</span>
                        <span class="json-value" id="botAdmins">-</span>
                    </div>
                    <div class="stat-row">
                        <span class="text-success fst-italic">Mods:</span>
                        <span class="json-value" id="botMods">-</span>
                    </div>
                    <div class="stat-row">
                        <span class="text-info fst-italic">VIPs:</span>
                        <span class="json-value fst-italic" id="botVips">-</span>
                    </div>

                </div>
            </div>
        </div>
    </div>
    
    <!-- JOBB OLDAL: -->
    <div class="col-12 col-md-4 col-lg-4 col-xl-4">
<!-- 1. kártya -->
        <div class="mb-3">
            <div class="card border-info h-350" style="min-width: 280px;">
                <div class="card-body p-3">
                    <div class="card border-info shadow text-info p-2 my-card text-center mb-3">📡</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Status:</span>
                        <span class="text-success fw-bold" id="botStatus">-</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Bot uptime:</span>
                        <span class="text-success fw-bold" id="botUptime">-</span>
                    </div>
					<div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Max uptime:</span>
                        <span class="text-success fw-bold" id="botMaxUptime">-</span>
                    </div>

                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Max connect:</span>
                        <span class="text-success fw-bold" id="botMaxConnectTime">-</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Server uptime:</span>
                        <span class="text-success fw-bold" id="serverUptime">-</span>
                    </div>
                </div>
            </div>
        </div>
        <!-- 2. kártya -->
        <div class="mb-3">
            <div class="card border-info h-200" style="min-width: 280px;">
                <div class="card-body p-4">
                    <div class="card border-info shadow text-info p-2 my-card text-center mb-3">🤖</div>
					<div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">NickName:</span>
                        <span class="text-primary fw-bold" id="botName">-</span>
                    </div>
					<div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Channels:</span>
                        <span class="text-success fw-bold" id="botChannels">-</span>
                    </div>
					<div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Users:</span>
                        <span class="text-success fw-bold" id="botTotalUsers">-</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Version:</span>
                        <span class="text-success fw-bold" id="botVersion">-</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Go Version:</span>
                        <span class="text-success fw-bold" id="botGoVersion">-</span>
                    </div>
					 <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">SqlKey:</span>
                        <span class="text-success fw-bold" id="botKey">-</span>
                    </div>
					<div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Owner:</span>
                        <span class="text-success fw-bold" id="botOwner">-</span>
                    </div>
					<div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Last Update:</span>
                        <span class="text-success fw-bold" id="botLastUpdated">-</span>
                    </div>	

                </div>
            </div>
        </div>
        

		
		        <!-- 3. kártya -->
		        <div class="mb-3">
            <div class="card border-info h-350" style="min-width: 280px;">
                <div class="card-body p-3">
                    <div class="card border-info shadow text-info p-2 my-card text-center mb-3">💻</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Process Memory:</span>
                        <span class="text-success fw-bold" id="botMemory">-</span>
                    </div>
					                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Active RAM:</span>
                        <span class="text-success fw-bold" id="botRamUsed">-</span>
                    </div>
					
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">CPU Usage:</span>
                        <span class="text-success fw-bold" id="botCPU">-</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Disk Usage:</span>
                        <span class="text-success fw-bold" id="botDiskUsage">-</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Goroutines:</span>
                        <span class="text-success fw-bold" id="botLoadAvg">-</span>
                    </div>
					                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-info fw-bold">Threads:</span>
                        <span class="text-success fw-bold stat-value" id="botThreads">-</span>
                    </div>
					
                </div>
            </div>
        </div>
    </div>
</div>


        </div>
       
    </div>

<div  id="ynmTrafficChartContainer"  style="margin-top: 15px; display: none;">
<span class="stat-value" id="botNetworkTraffic">-</span>
</div>













