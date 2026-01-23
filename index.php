<?php
// index.php
session_start();
require_once 'config.php';
require_once 'auth.php';


// DEBUG - session tartalom
error_log('SESSION CONTENTS: ' . print_r($_SESSION, true));

// alapértelmezések
date_default_timezone_set('Europe/Bucharest');
$page = $_GET['page'] ?? 'ynm';
$username = $_SESSION['username'] ?? 'Guest';
$globalRole = $_SESSION['role'] ?? 'user';
$effectiveRole = $_SESSION['effective_role'] ?? $globalRole;
$isLoggedIn = isset($_SESSION['username']) && $_SESSION['username'] !== 'Guest';

// DEBUG
error_log('isLoggedIn: ' . ($isLoggedIn ? 'TRUE' : 'FALSE'));
error_log('username: ' . $username);
error_log('SESSION at page load: ' . print_r($_SESSION, true));







$page = $_GET['page'] ?? 'ynm';
   $allowed_pages = ['ynm', 'users', 'channels', 'channel_users', 'database', 'logs', 'plugins', 'profile'];
   
   if (!in_array($page, $allowed_pages)) {
       $page = 'ynm';
   }
   

// Jogosultság ellenőrzés
if (!canAccessPage($page)) {
    $page = 'ynm';
}

?>
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
	<meta name="description" content="YnM-Go Admin Panel – kezelje a felhasználókat, csatornákat és beállításokat gyorsan és egyszerűen.">
    <meta name="author" content="Markus">
	<meta name="keywords" content="YnM-Go, Docker, Irc, Mirc, Ircd, GoLang, Markus, YnM, BoT, MircBot, IrcBot" />
    <title>YnM-Go Admin Panel - <?= ucfirst($page) ?></title>
	<meta name="title" content="YnM-Go Admin Panel" />
	 <meta name="supported-color-schemes" content="light dark" />
    <link rel="icon" type="image/png" sizes="16x16" href="dist/img/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="dist/img/favicon-32x32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="dist/img/apple-touch-icon.png">
    <link rel="manifest" href="dist/img/site.webmanifest">
    <link rel="icon" sizes="192x192" href="dist/img/android-chrome-192x192.png">
    <link rel="icon" sizes="512x512" href="dist/img/android-chrome-512x512.png">
  <link href="dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="dist/css/all.min.css">
  <link rel="stylesheet" href="dist/css/ynm-footer.css">
    <link rel="stylesheet" href="dist/css/ynm-bal.css">
	<link rel="stylesheet" href="dist/css/ynm-index.css">
	<link rel="stylesheet" href="css/<?= $page ?>.css">

<style>

</style>
</head>

<body >
  <!-- Sidebar -->
  <nav id="layoutSidenav_nav" aria-label="sidebar">
    <div class="sb-sidenav">
      <div class="px-3 mb-3">
    <a href="/" class="d-flex align-items-center text-decoration-none">
      <img src="dist/img/favicon-32x32.png" alt="YnM-Go Logo" class="brand-image img-circle elevation-3" style="opacity: .8">
      <span class="nav-link-text fs-5 fw-semibold">YnM-Go</span>
    </a>
  </div>
      <div class="sb-sidenav-menu">
        <ul class="nav flex-column">
          <li class="nav-item">
            <a href="#ynm" class="nav-link" data-page="ynm" data-title="YnM-Go Status">
              <span class="sb-nav-link-icon"><i class="fa-solid fa-house"></i></span>
              <span class="nav-link-text">YnM-Go Status</span>
            </a>
          </li>
		  
		  
<li class="nav-item">
    <div class="small text-muted px-3 sb-sidenav-menu-heading">Users & Channels</div>
    
    <?php if ($isLoggedIn): ?>
		<a href="#ynmusers" class="nav-link" data-page="ynmusers" data-title="YnM Users">
			<span class="sb-nav-link-icon">👥</span><span class="nav-link-text">Users</span></a>
        
		<a href="#ynmuserschannels" class="nav-link" data-page="ynmuserschannels" data-title="User Channels">
            <span class="sb-nav-link-icon">👨‍💻</span><span class="nav-link-text">Users Access</span></a>
        
		<a href="#ynmchannels" class="nav-link" data-page="ynmchannels" data-title="Channels">
			<span class="sb-nav-link-icon">#️⃣</span><span class="nav-link-text">Channels</span></a>
    
    <?php else: ?>
		<a href="#" class="nav-link disabled" title="Login required 🔐" data-bs-title="Login Required  🔐" data-bs-toggle="tooltip" >
			<span class="sb-nav-link-icon">👥</span><span class="nav-link-text">Users (🔐)</span></a>
       
		<a href="#" class="nav-link disabled tooltip-wrapper" title="Login required 🔐" data-bs-title="Login Required  🔐" data-bs-toggle="tooltip" >
			<span class="sb-nav-link-icon">👨‍💻</span><span class="nav-link-text">Users Access (🔐)</span></a>
		<a href="#" class="nav-link disabled" title="Login required 🔐" data-bs-title="Login Required  🔐" data-bs-toggle="tooltip" >
			<span class="sb-nav-link-icon">#️⃣</span><span class="nav-link-text">Channels (🔐)</span></a>
    <?php endif; ?>
</li>

		  
<li class="nav-item">
    <div class="small text-muted px-3 sb-sidenav-menu-heading">Settings</div>
    <?php if ($isLoggedIn): ?>
        <a href="#ynmprofile" class="nav-link" data-page="ynmprofile" data-title="Profile">
            <span class="sb-nav-link-icon">🪪</span>
            <span class="nav-link-text">Profile</span>
        </a>
        <a href="#ynmdatabase" class="nav-link" data-page="ynmdatabase" data-title="YnM-Go Database">
            <span class="sb-nav-link-icon">🗃️</span>
            <span class="nav-link-text">Database</span>
        </a>
        <a href="#ynmlogs" class="nav-link" data-page="ynmlogs" data-title="YnM-Go Logs">
            <span class="sb-nav-link-icon">📝</span>
            <span class="nav-link-text">Logs</span>
        </a>
    <?php else: ?>
		<a href="#" class="nav-link disabled"  title="Login required 🔐" data-bs-title="Login Required  🔐" data-bs-toggle="tooltip" >
			<span class="sb-nav-link-icon">🪪</span><span class="nav-link-text">Profile (🔐)</span></a>
			
		<a href="#" class="nav-link disabled"  title="Login required 🔐" data-bs-title="Login Required  🔐" data-bs-toggle="tooltip" >
			<span class="sb-nav-link-icon">🗃️</span><span class="nav-link-text">Database (🔐)</span></a>
		<a href="#" class="nav-link disabled"  title="Login required 🔐" data-bs-title="Login Required  🔐" data-bs-toggle="tooltip" >
			<span class="sb-nav-link-icon">📝</span> <span class="nav-link-text">Logs (🔐)</span></a>
    
	<?php endif; ?>
</li>


        </ul>
      </div>
    </div>
  </nav>

<!-- Sticky Topbar -->
  <div class="topbar ">
    <button id="sidebarToggle" class="btn btn-outline-secondary btn-sm" title="Toggle sidebar">
      <i class="fa-solid fa-bars"></i>
    </button>
    <div class="ms-auto d-flex align-items-center gap-2">

      <button id="fullscreenBtn" class="btn btn-outline-secondary btn-sm" title="Teljes képernyő">
        <i id="fullscreenIcon" class="fa-solid fa-expand"></i>
      </button>
      
      <div class="dropdown">
        <button class="btn btn-outline-secondary btn-sm dropdown-toggle" id="themeDropdown" data-bs-toggle="dropdown" aria-expanded="false" title="Téma">
          <i id="themeIcon" class="fa-regular fa-circle-half-stroke"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="themeDropdown">
          <li><button class="dropdown-item" data-theme="auto"><i class="fa-solid fa-circle-half-stroke me-2"></i>Auto</button></li>
          <li><button class="dropdown-item" data-theme="light"><i class="fa-solid fa-sun me-2"></i>Világos</button></li>
          <li><button class="dropdown-item" data-theme="dark"><i class="fa-solid fa-moon me-2"></i>Sötét</button></li>
        </ul>
      </div>

      <?php if ($isLoggedIn): ?>
          <!-- Ha be vagy jelentkezve: User dropdown -->
          <div class="dropdown user-dropdown" id="userDropdownMenu" style="display: block;">
              <button class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" id="userDropdownBtn">
                  <?= htmlspecialchars($username) ?>
                  <span class="badge badge-<?= strtolower($effectiveRole) ?> ms-1"><?= strtoupper($effectiveRole) ?></span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" href="#settings" data-page="settings"><i class="fas fa-cog me-2"></i>Settings</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" onclick="logout(); return false;"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
              </ul>
          </div>
      <?php else: ?>
          <!-- Ha Guest vagy: Login gomb -->
          <button class="btn btn-primary login-btn" id="loginButton" data-bs-toggle="modal" data-bs-target="#staticBackdrop" style="display: inline-block;">
              <i class="fas fa-sign-in-alt me-1"></i>Login
          </button>
      <?php endif; ?>
      
    </div>
  </div>
  
  
  <!-- Main content -->
  <div id="layoutSidenav_content">
    <main class="page-content container-fluid" id="mainContent">
      <div class="spinner-border text-primary" role="status" id="initialSpinner">
        <span class="visually-hidden">Loading...</span>
      </div>
    </main>
  </div>



      <!-- Footer -->


  <footer id="ynmFooter">
    <div class="container-fluid d-flex justify-content-between">

        <div class="footer-left">

            <p class="footer-small">Made with ❤️ for IRC community</p>
        </div>
        <div class="footer-center">
            <p>&copy; 2012 - <?= date('Y') ?> YnM-Go - Admin Panel v2.3</p>
        </div>
        <div class="footer-right">
            <span class="footer-status"><a href="https://ynm.hu" data-page="YnM"  data-title="YnM"  target="_blank"rel="noopener noreferrer">YnM</a></span>
        </div>
    </div>
  </footer>

	<!-- Modal -->
  <div class="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="staticBackdropLabel">🔐 YnM Admin - Secure Authentication</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      
      <div class="modal-body">
        <div class="login-container">      
          <form id="loginForm">
            <div class="mb-3">
              <label for="username" class="form-label">
                <i class="fas fa-user me-2"></i>Username
              </label>
              <input type="text" class="form-control" id="username" name="username" required autocomplete="username" placeholder="Enter your username">
            </div>
            
            <div class="mb-4">
              <label for="password" class="form-label">
                <i class="fas fa-key me-2"></i>Dynamic Password
              </label>
              <input type="password" class="form-control" id="password" name="password" required autocomplete="current-password" placeholder="Enter your generated password">
            </div>
            
            <div id="loginResult" class="alert alert-dismissible fade" style="display: none;"></div>
          </form>
          
          <div class="alert alert-info mt-4">
            <div class="d-flex align-items-start">
              <i class="fas fa-mobile-alt me-3 mt-1"></i>
              <div>
                <h6 class="alert-heading mb-2"><i class="fas fa-info-circle me-1"></i> How to get password:</h6>
                <ol class="mb-0 ps-3" style="font-size: 0.9rem;">
                  <li class="mb-1">Type <code>!web</code> in the IRC channel</li>
                  <li class="mb-1">Check your private messages from the bot</li>
                  <li>Use the generated one-time password here</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
          <i class="fas fa-times me-1"></i>Cancel
        </button>
        <button type="submit" form="loginForm" class="btn btn-primary">
          <i class="fas fa-sign-in-alt me-1"></i>Login
        </button>
      </div>
    </div>
  </div>
</div>

<script src="dist/js/popper.min.js"></script>
<script src="dist/js/bootstrap.bundle.min.js"></script>
<script src="dist/js/ynm-full-b-w.js"></script>
<script src="dist/js/ynm-login.js"></script>

<script src="dist/js/ynm-loader.js"></script>
<script src="dist/js/ynm-oldal.js"></script>
<script src="js/main.js"></script>
<script src="dist/js/chart.js"></script>
<script src="js/<?= $page ?>.js"></script>
<script src="dist/js/ynm-mob-link-log.js"></script>


</body>
</html>