import Image from '@/lib/ui/useable-components/safe-image';
import { memo } from 'react';
import { timeAgo } from '@/lib/utils/methods';

// Interfaces
export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface ITicket {
  _id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  orderId?: string;
  otherDetails?: string;
  createdAt: string;
  updatedAt: string;
  user: IUser;
  lastMessageAt?: string;
}

interface IUserTicketCardProps {
  user: IUser;
  latestTicket: ITicket | null;
  isSelected: boolean;
  onClick: () => void;
  formatDate: (dateString: string) => string;
}

// Using memo to prevent unnecessary re-renders
function UserTicketCard({ 
  user, 
  latestTicket, 
  isSelected, 
  onClick,
  formatDate
}: IUserTicketCardProps) {
  const formatTimeAgo = (timestamp: string) => timeAgo(timestamp);

  return (
    <div 
      onClick={onClick} 
      className={`flex items-center border-b border-gray-200 dark:border-dark-600 p-3 cursor-pointer ${
        isSelected
          ? 'bg-black text-white dark:bg-dark-900 dark:text-white'
          : 'bg-white text-black dark:bg-dark-950 dark:text-white'
      }`}
    >
      {/* User avatar */}
      <div className="relative">
        <Image
          width={40}
          height={40}
          src="https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
          alt="User avatar"
          className="h-10 w-10 rounded-full mr-3"
        />
      </div>
      
      {/* User name and ticket info */}
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <h3 className={`font-medium text-base ${isSelected ? 'text-white' : 'text-black dark:text-white'}`}>
            {user.name}
          </h3>
          {latestTicket && (
            <span className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500 dark:text-white'}`}>
              {formatTimeAgo(latestTicket.lastMessageAt || latestTicket.updatedAt)}
            </span>
          )}
        </div>
        
        {/* Preview of latest ticket/message */}
        {latestTicket && (
          <p className={`text-sm truncate ${isSelected ? 'text-gray-300' : 'text-gray-500 dark:text-white'}`}>
            {latestTicket.title}
          </p>
        )}
        
        {/* Status badge for latest ticket */}
        {latestTicket && (
          <div className="mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isSelected
                ? 'bg-gray-700  text-white'
                : latestTicket.status === 'open'
                  ? 'bg-blue-100 text-blue-800'
                  : latestTicket.status === 'inProgress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-primary-color text-white'
            }`}>
              {latestTicket.status === 'inProgress' ? 'In Progress' : 
               latestTicket.status.charAt(0).toUpperCase() + latestTicket.status.slice(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Use React.memo to prevent unnecessary re-renders
export default memo(UserTicketCard);
