import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

interface RoleCardProps {
  id: string;
  title: string;
  pay: string;
  hiredCount: number;
}

const RoleCard = ({ id, title, pay, hiredCount }: RoleCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/role/${id}`)}
      className="group border border-border rounded-xl p-5 bg-card hover:shadow-card-hover transition-all duration-200 cursor-pointer active:scale-[0.98]"
    >
      <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{pay}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center"
              >
                <Users size={12} className="text-muted-foreground" />
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{hiredCount} hired recently</span>
        </div>
        <span className="text-xs font-medium text-primary group-hover:underline">Apply</span>
      </div>
    </div>
  );
};

export default RoleCard;
