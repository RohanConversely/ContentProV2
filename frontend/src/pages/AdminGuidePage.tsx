import { BookOpen, Users, FileText, Image, Settings, Eye, Trash2, Plus, Pencil, Search, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "User Management",
    icon: Users,
    description: "Manage all users in the system, including creating new accounts, updating roles, and deleting users.",
    features: [
      {
        name: "View All Users",
        description: "See a list of all registered users with their email, role, industry, and account status.",
        location: "Users tab in the Admin page"
      },
      {
        name: "Create New User",
        description: "Add new users by filling in their email, display name, password, role (user/superadmin), and industry.",
        location: "Create User form at the top of the page"
      },
      {
        name: "Edit User",
        description: "Modify user details including display name, role, industry, default image model, and plan.",
        location: "Edit button (pencil icon) next to each user"
      },
      {
        name: "Delete User",
        description: "Remove a user account from the system. This action cannot be undone.",
        location: "Delete button (trash icon) next to each user"
      },
      {
        name: "Change User Role",
        description: "Assign 'user' or 'superadmin' role. Superadmins have full access to admin features.",
        location: "Role dropdown in the user list"
      },
      {
        name: "View User Projects",
        description: "Click on a user's name to view all their projects and manage them directly.",
        location: "Click on user name in the list"
      }
    ]
  },
  {
    title: "Default Prompts",
    icon: FileText,
    description: "Configure default prompts that are used as the base for image generation across different industries.",
    features: [
      {
        name: "View Industry Prompts",
        description: "See all industry-specific default prompts in one place.",
        location: "Prompts section in the Admin page"
      },
      {
        name: "Create Industry Prompt",
        description: "Add a new default prompt for an industry that doesn't have one yet.",
        location: "Create button in the Prompts section"
      },
      {
        name: "Edit Industry Prompt",
        description: "Modify the default prompt text for a specific industry.",
        location: "Edit button next to each industry prompt"
      },
      {
        name: "Delete Industry Prompt",
        description: "Remove a default prompt for an industry. The industry will use no default prompt.",
        location: "Delete button next to each industry prompt"
      },
      {
        name: "Copy Prompt to Another Industry",
        description: "Easily copy a prompt from one industry to another to speed up setup.",
        location: "Copy icon in the prompt list"
      }
    ]
  },
  {
    title: "Category Prompts",
    icon: Settings,
    description: "Set up more specific prompts for different categories within each industry.",
    features: [
      {
        name: "View Category Prompts",
        description: "See all categories and their specific prompts for each industry.",
        location: "Categories section (expandable under each industry)"
      },
      {
        name: "Create Category Prompt",
        description: "Add a new category with its own prompt within an industry.",
        location: "Add Category button in the category section"
      },
      {
        name: "Edit Category Prompt",
        description: "Modify the prompt text for a specific category.",
        location: "Edit button in the category expansion"
      },
      {
        name: "Set Default Category",
        description: "Mark a category as the default to use when no specific category is selected.",
        location: "Default toggle in category settings"
      },
      {
        name: "Delete Category Prompt",
        description: "Remove a category and its prompt from an industry.",
        location: "Delete button in the category section"
      }
    ]
  },
  {
    title: "User Prompt Overrides",
    icon: Pencil,
    description: "Override default prompts for specific users to give them customized image generation instructions.",
    features: [
      {
        name: "View User Overrides",
        description: "See if any users have custom prompt overrides set up.",
        location: "User details modal (click on user name)"
      },
      {
        name: "Set User Prompt Override",
        description: "Create a custom prompt that overrides the default for a specific user.",
        location: "Prompt Override section in user modal"
      },
      {
        name: "Set User Category Override",
        description: "Set a specific category override for a user's custom prompts.",
        location: "Category Override section in user modal"
      },
      {
        name: "Remove User Override",
        description: "Delete a user's custom prompt to revert to default prompts.",
        location: "Delete override button in user modal"
      }
    ]
  },
  {
    title: "Project Management",
    icon: Image,
    description: "View and manage projects created by other users directly from the admin panel.",
    features: [
      {
        name: "View User Projects",
        description: "Access all projects belonging to any user in the system.",
        location: "Click on a user's name from the users list"
      },
      {
        name: "View Project Details",
        description: "See all details of a user's project including images, input, and settings.",
        location: "Click on any project from the user's project list"
      },
      {
        name: "Regenerate Images",
        description: "Regenerate images for a user's project with new settings or prompts.",
        location: "Regenerate button in the project view"
      },
      {
        name: "Download Project Assets",
        description: "Download images or archives of a user's project.",
        location: "Download buttons in project detail view"
      }
    ]
  },
  {
    title: "Job Logs & Troubleshooting",
    icon: Search,
    description: "Access job execution logs to debug issues and monitor system performance.",
    features: [
      {
        name: "View Job Logs",
        description: "See detailed logs of all job executions including errors and warnings.",
        location: "Job Logs button in any project view"
      },
      {
        name: "Filter Logs by Level",
        description: "Filter logs by type: info, warning, or error to focus on relevant entries.",
        location: "Filter dropdown in logs viewer"
      },
      {
        name: "View Admin View Logs",
        description: "When viewing another user's project, see their job logs too.",
        location: "Job Logs button visible in admin view mode"
      }
    ]
  }
];

const AdminGuidePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Guide</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel Guide</h1>
            <p className="text-muted-foreground mt-1">
              Learn how to use all the features available in the admin panel
            </p>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">Getting Started</h2>
          <p className="text-muted-foreground">
            The admin panel allows you to manage users, configure default prompts, and oversee all projects in the system.
            Use the navigation above to access the main Admin page. This guide explains each feature in detail below.
          </p>
        </div>

        <div className="space-y-12">
          {sections.map((section, index) => (
            <div key={index} className="scroll-mt-20" id={section.title.toLowerCase().replace(/\s+/g, "-")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <p className="text-muted-foreground mb-6">{section.description}</p>

              <div className="grid gap-4 md:grid-cols-2">
                {section.features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold">{feature.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-flex">
                      <Eye className="w-3 h-3" />
                      <span>{feature.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 border rounded-lg bg-muted/30">
          <h2 className="text-lg font-semibold mb-2">Quick Tips</h2>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-start gap-2">
              <Plus className="w-4 h-4 mt-0.5 text-primary" />
              <span>Use the search bar to quickly find users by name or email</span>
            </li>
            <li className="flex items-start gap-2">
              <Plus className="w-4 h-4 mt-0.5 text-primary" />
              <span>Default prompts are inherited by all users in that industry unless overridden</span>
            </li>
            <li className="flex items-start gap-2">
              <Plus className="w-4 h-4 mt-0.5 text-primary" />
              <span>User-specific overrides take precedence over default prompts</span>
            </li>
            <li className="flex items-start gap-2">
              <Plus className="w-4 h-4 mt-0.5 text-primary" />
              <span>Superadmin role is required to access all admin features</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Go to Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminGuidePage;