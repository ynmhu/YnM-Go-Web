<div class="page-header">
    <h2>🔌 Plugin Management</h2>
    <button class="btn btn-primary" onclick="showAddPluginModal()">➕ Install Plugin</button>
</div>

<!-- Coming Soon Notice -->
<div class="coming-soon-notice">
    <div class="notice-icon">🚧</div>
    <h3>Plugin System - Coming Soon</h3>
    <p>The plugin management system is currently under development. This feature will allow you to:</p>
    
    <ul class="features-list">
        <li>Install and manage bot plugins</li>
        <li>Enable/disable plugins dynamically</li>
        <li>Configure plugin settings</li>
        <li>Update plugins automatically</li>
        <li>View plugin statistics and logs</li>
    </ul>
    
    <p style="margin-top: 20px; color: #666;">
        Stay tuned for future updates!
    </p>
</div>

<!-- Planned Features -->
<div class="dashboard-section">
    <h3>📋 Planned Features</h3>
    
    <div class="feature-grid">
        <div class="feature-card">
            <div class="feature-icon">📦</div>
            <h4>Plugin Repository</h4>
            <p>Browse and install plugins from a centralized repository</p>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">⚙️</div>
            <h4>Configuration Manager</h4>
            <p>Easy-to-use interface for plugin configuration</p>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">🔄</div>
            <h4>Auto Updates</h4>
            <p>Automatic plugin updates with version control</p>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h4>Statistics & Analytics</h4>
            <p>Track plugin usage and performance metrics</p>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">🔒</div>
            <h4>Security Scanning</h4>
            <p>Automatic security checks for installed plugins</p>
        </div>
        
        <div class="feature-card">
            <div class="feature-icon">🧩</div>
            <h4>API Integration</h4>
            <p>Easy integration with external services</p>
        </div>
    </div>
</div>

<!-- Contact Info -->
<div class="dashboard-section">
    <h3>💡 Suggestions?</h3>
    <p>If you have any suggestions for the plugin system or would like to contribute, please contact the development team.</p>
    
    <div style="margin-top: 15px;">
        <button class="btn btn-info" onclick="alert('Contact: admin@ynm.hu')">📧 Contact Us</button>
    </div>
</div>

<style>
.coming-soon-notice {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 15px;
    padding: 50px;
    text-align: center;
    margin-bottom: 30px;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.notice-icon {
    font-size: 5rem;
    margin-bottom: 20px;
}

.coming-soon-notice h3 {
    font-size: 2rem;
    margin-bottom: 20px;
}

.coming-soon-notice p {
    font-size: 1.1rem;
    opacity: 0.9;
}

.coming-soon-notice .features-list {
    text-align: left;
    max-width: 600px;
    margin: 20px auto;
    background: rgba(255, 255, 255, 0.1);
    padding: 20px 40px;
    border-radius: 10px;
}

.coming-soon-notice .features-list li {
    margin: 10px 0;
    font-size: 1rem;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.feature-card {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 25px;
    text-align: center;
    transition: all 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.feature-icon {
    font-size: 3rem;
    margin-bottom: 15px;
}

.feature-card h4 {
    color: #333;
    margin-bottom: 10px;
    font-size: 1.2rem;
}

.feature-card p {
    color: #666;
    font-size: 0.95rem;
    line-height: 1.5;
}

@media (max-width: 768px) {
    .coming-soon-notice {
        padding: 30px 20px;
    }
    
    .notice-icon {
        font-size: 3rem;
    }
    
    .coming-soon-notice h3 {
        font-size: 1.5rem;
    }
    
    .feature-grid {
        grid-template-columns: 1fr;
    }
}
</style>