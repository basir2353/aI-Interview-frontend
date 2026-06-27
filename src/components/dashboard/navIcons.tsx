import {
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquare,
  Shield,
  UserCog,
  Users,
  UserSquare2,
  type LucideIcon,
} from 'lucide-react';

export const adminNavIcons: Record<string, LucideIcon> = {
  '/admin': LayoutDashboard,
  '/community': MessageSquare,
  '/admin/access': Shield,
  '/admin/admins': UserCog,
  '/admin/recruiters': Users,
  '/admin/candidates': UserSquare2,
  '/admin/schedules': Calendar,
  '/admin/applications': FileText,
  '/admin/questions': ClipboardList,
  '/admin/interview-layout': LayoutTemplate,
};

export const recruiterNavIcons: Record<string, LucideIcon> = {
  '/recruiter': LayoutDashboard,
  '/recruiter/interviewer-settings': UserCog,
  '/community': MessageSquare,
  '/recruiter/applicants': Users,
  '/recruiter/jobs': Briefcase,
  '/recruiter/results': ClipboardList,
  '/recruiter/schedule': Calendar,
};
