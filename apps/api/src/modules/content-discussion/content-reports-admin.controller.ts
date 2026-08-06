import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { ContentDiscussionService } from './content-discussion.service';
import { ListContentReportsQueryDto } from './dto/content-discussion.dto';

@Controller('admin/content-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ContentReportsAdminController {
  constructor(private readonly contentDiscussionService: ContentDiscussionService) {}

  @Get()
  list(@Query() query: ListContentReportsQueryDto) {
    return this.contentDiscussionService.listReportsForAdmin(query, query.status);
  }

  @Patch(':id')
  resolve(@Param('id') id: string, @Body('status') status: 'RESOLVED' | 'DISMISSED') {
    return this.contentDiscussionService.resolveReport(id, status);
  }
}
