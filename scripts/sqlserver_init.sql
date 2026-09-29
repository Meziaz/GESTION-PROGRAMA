-- sqlserver_init.sql
-- Run this script against your SQL Server instance to create the tables needed for task management

IF OBJECT_ID(N'dbo.projects', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.projects (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        bac DECIMAL(18,2) NULL,
        project_type NVARCHAR(100) NULL,
        status NVARCHAR(50) NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID(N'dbo.tasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tasks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        project_id INT NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        deliverable NVARCHAR(MAX) NULL,
        optimal_time DECIMAL(10,2) NULL,
        estimated_time DECIMAL(10,2) NULL,
        pessimistic_time DECIMAL(10,2) NULL,
        duration DECIMAL(10,2) NULL,
        cost DECIMAL(18,2) NULL,
        progress_percentage DECIMAL(5,2) NULL,
        status NVARCHAR(50) NULL,
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_tasks_projects FOREIGN KEY (project_id) REFERENCES dbo.projects(id) ON DELETE CASCADE
    );
END;
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.tasks', N'optimal_time') IS NULL ALTER TABLE dbo.tasks ADD optimal_time DECIMAL(10,2) NULL;
    IF COL_LENGTH(N'dbo.tasks', N'estimated_time') IS NULL ALTER TABLE dbo.tasks ADD estimated_time DECIMAL(10,2) NULL;
    IF COL_LENGTH(N'dbo.tasks', N'pessimistic_time') IS NULL ALTER TABLE dbo.tasks ADD pessimistic_time DECIMAL(10,2) NULL;
    IF COL_LENGTH(N'dbo.tasks', N'duration') IS NULL ALTER TABLE dbo.tasks ADD duration DECIMAL(10,2) NULL;
    IF COL_LENGTH(N'dbo.tasks', N'progress_percentage') IS NULL ALTER TABLE dbo.tasks ADD progress_percentage DECIMAL(5,2) NULL;
END;

IF OBJECT_ID(N'dbo.task_predecessors', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.task_predecessors (
        task_id INT NOT NULL,
        predecessor_id INT NOT NULL,
        CONSTRAINT PK_task_predecessors PRIMARY KEY (task_id, predecessor_id),
        CONSTRAINT FK_tp_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_tp_pred FOREIGN KEY (predecessor_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE,
        CONSTRAINT CK_tp_no_self CHECK (task_id <> predecessor_id)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_tasks_project_id' AND object_id = OBJECT_ID(N'dbo.tasks'))
    CREATE INDEX IX_tasks_project_id ON dbo.tasks(project_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_tp_task' AND object_id = OBJECT_ID(N'dbo.task_predecessors'))
    CREATE INDEX IX_tp_task ON dbo.task_predecessors(task_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_tp_pred' AND object_id = OBJECT_ID(N'dbo.task_predecessors'))
    CREATE INDEX IX_tp_pred ON dbo.task_predecessors(predecessor_id);

